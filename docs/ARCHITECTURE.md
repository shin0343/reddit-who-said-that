# Architecture

Stack (confirmed against the official template, Devvit 0.15.4): **Devvit Web · React 19 · TypeScript 6 · Vite 8 · Tailwind 4 · Hono (server) · Devvit Redis · Devvit Realtime · Devvit Scheduler.** No tRPC (the template's `AGENTS.md` mentioned it, but the template doesn't ship it). Plain `fetch` + shared TS types.

## 1. System diagram

```mermaid
flowchart LR
  subgraph Client["Client (iframe on reddit.com)"]
    Splash["splash.html<br/>inline feed view"] -->|requestExpandedMode| Game["game.html<br/>games/who-said-that/*"]
  end
  subgraph Server["Server (serverless Node, Hono)"]
    API["/api/wst/*<br/>routes.ts"] --> Engine["Game engine<br/>(state transitions)"]
    Engine --> Scoring["scoring.ts (pure)"]
    Engine --> Daily["Daily service"]
    Engine --> Room["Room service (Phase 3)"]
    Daily --> Provider["Question provider"]
    Engine --> LB["Leaderboard service"]
    Internal["/internal/*<br/>menu · triggers · scheduler"] --> Daily
  end
  Game -- "fetch /api (JSON)" --> API
  Room -- "realtime.send" --> RT[("Devvit Realtime")]
  RT -- "connectRealtime" --> Game
  Provider -- "getCommentById" --> Reddit[("Reddit API")]
  Daily & LB & Room & Provider --> Redis[("Redis<br/>per subreddit")]
  Cron(["Scheduler cron"]) --> Internal
```

## 2. Modules

| # | Module | Location | Role | Depends on |
|---|---|---|---|---|
| 1 | Client UI | `src/client/` (`splash.tsx`, `game.tsx`, `games/who-said-that/`) | Render state from the server, collect choices. Holds no answers. | shared contracts |
| 2 | Game engine | `src/server/games/who-said-that/engine.ts` (Phase 2) | Validates actions (`guess`, `hint`), advances player/room state, calls scoring | 3–7 |
| 3 | Question provider | `src/server/providers/questions.ts` (Phase 1) | `QuestionRecord` from curated bank; validates and sanitizes Reddit comments; sample fallback | Reddit API, Redis |
| 4 | Daily service | `src/server/services/daily.ts` (Phase 2) | Picks today's 5 IDs, idempotent create, per-user progress | provider, Redis, `dateKey.ts` ✅ |
| 5 | Room service | `src/server/services/rooms.ts` (Phase 3) | Room lifecycle, round timers, realtime broadcasts | engine, Redis, Realtime |
| 6 | Scoring | `src/server/games/who-said-that/scoring.ts` ✅ | Pure `scoreRound()`; unit-tested | `WST` constants |
| 7 | Leaderboard | `src/server/services/leaderboard.ts` (Phase 4) | Sorted-set wrapper keyed by `{game}:{period}`; top N + my rank; streaks | Redis |
| 8 | Reddit integration | `src/server/core/post.ts` ✅, `routes/menu.ts` ✅, `routes/triggers.ts` ✅ | Create daily post, mod menu actions, install trigger | Reddit API |
| 9 | Storage | Redis only (no external DB) | See §4 | — |

Rule: **services are plain functions taking explicit inputs** (`dateKey`, `userId`), so they test with `node --test` without Devvit. Only route files import `context`.

## 3. Client vs. server responsibility

| Client | Server |
|---|---|
| Rendering, animation, countdown from server `endsAt` | Answers, shuffling, timing (`issuedAt`), scoring, distribution |
| Sends `{questionId, choice, hintsUsed}` | Rejects duplicate/late/out-of-order guesses |
| Caches nothing important (localStorage is wiped on app updates) | All persistent state in Redis |
| Never sees `answerSubreddit`/`threadTitle` before reveal | `PublicQuestion` vs `QuestionRecord` split enforces this |

**Auth:** identity = `context.userId` / `reddit.getCurrentUsername()` on the server. Never trust a user ID from the request body. No `userId` (logged out) → read-only. Mod-only actions check `forUserType: moderator` in `devvit.json` **and** re-check mod permissions server-side.

## 4. State and Redis keys

Redis is per subreddit, has no key scan, no lists/sets → every key is derivable from (`dateKey`, `userId`, `roomCode`); sorted sets replace sets/queues. Prefix every key with the game id.

| Key | Type | Contents | TTL |
|---|---|---|---|
| `wst:q:{qid}` | string (JSON) | `QuestionRecord` snapshot | 14 d after last use |
| `wst:bank` | zset | qid → added-at; pool of approved cases | — |
| `wst:used` | zset | qid → dateKey-as-number used | — |
| `wst:daily:{date}` | hash | `qids` (JSON array), `postId`, `createdAt` | 30 d |
| `wst:play:{date}:{uid}` | hash | `round`, `issuedAt`, `results` (JSON), `total`, `doneAt` | 30 d |
| `wst:dist:{date}:{qid}` | hash | choice → count (`hIncrBy`) | 30 d |
| `wst:lb:{date}` | zset | uid → score (tie-break encoded as `score*1e7 - secondsSinceMidnight`) | 30 d |
| `wst:streak:{uid}` | hash | `last`, `count` | — |
| `wst:room:{code}` | hash | `host`, `status`, `round`, `endsAt`, `players` (JSON) | 2 h |

Daily creation is idempotent: `watch(daily key)` → if absent, pick + `multi/exec`. Triggered by the cron job **and** lazily by the first `GET /api/wst/daily` of the day.

## 5. Realtime flow (Party Room, Phase 3)

Realtime is **server → client broadcast only**. Clients act via HTTP; the server mutates Redis, then broadcasts.

```
client POST /api/wst/party/{code}/guess ─▶ server: validate, store, maybe close round
server ─ realtime.send("wst-room-{code}", event) ─▶ all clients in room
```

Channel `wst-room-{code}` (no `:` allowed). Events: `lobby` (players/ready), `round-start` (`PublicQuestion`, `endsAt`), `round-reveal` (answer, picks, scores), `end` (ranking). Every event carries `seq`. A client that sees a gap, or reconnects, calls `GET /party/{code}/state` for a full snapshot.

There is no long-running process, so rounds close by: last player's guess, **or** any client's `POST /party/{code}/tick` after `endsAt` (idempotent, guarded by a transaction), **or** a `scheduler.runJob` at `endsAt` as a backstop (≤ 60/min, fine at hackathon scale).

## 6. Content lifecycle and deletion

1. **Curate:** a moderator or dev adds a comment ID with answer, distractors and explanation (seed file in Phase 1; mod menu form in P1).
2. **Validate** (provider): `getCommentById` → reject if deleted/removed, NSFW, < 40 or > 400 chars, or contains the answer sub name. Sanitize `u/…`, links, `r/…`.
3. **Snapshot** minimal text into `wst:q:{qid}`; never store the author.
4. **Re-validate** every case when building a day; replace failures from the bank. Expired snapshots drop out via TTL.
5. **Removal:** mod "Remove case" action deletes `wst:q:{qid}` and its bank entry (P1).

## 7. Adding a new mini-game (e.g. Reddit Courtroom)

1. Add the id to `GameId` in `src/shared/types/game.ts`.
2. Create `src/shared/games/<id>/contracts.ts`, `src/server/games/<id>/routes.ts`, `src/client/games/<id>/`.
3. Mount with `api.route('/<short-id>', routes)` in `src/server/index.ts`; Redis prefix `<short-id>:`.
4. Choose the game per post via post data (`docs/capabilities/server/post-data.mdx`) in `game.tsx`.
5. Generalize a service (rooms, leaderboard) **only when the second game needs it**. Copy first, extract on the second use.
