# Agent Handoff — READ THIS FIRST

Any agent starting work on this repo reads this file first, then only the doc sections it needs. Update §2, §6, §7 and §10 at the end of every phase.

## 1. Purpose
Entry for **Reddit's Game of the Day Hackathon 2026** (deadline **2026-12-08 18:00 PT**). *Who Said That?*: read an anonymous Reddit comment, guess which of 4 subreddits wrote it. Daily Case (5 cases/day) is the core; Party Room (2–6 live) is P1; more mini-games (Reddit Courtroom) may follow. Rules: `GAME_DESIGN.md`. Judging mapping: `HACKATHON_REQUIREMENTS.md` §3.

## 2. Status (2026-11-21): scaffold complete, Phase 1 not started
Typecheck, lint, unit tests and build pass locally. **Never run in Reddit playtest**: the Devvit CLI is not logged in on the dev machine.

## 3. Stack (fixed)
Devvit Web 0.15.4 (official `devvit-template-react`), React 19, TS 6, Vite 8, Tailwind 4, Hono server, Devvit Redis / Realtime / Scheduler. Node ≥ 24. No tRPC, no external DB, no HTTP Fetch (it would trigger app review + a privacy policy).

## 4. Layout
```
devvit.json                       app config (name, entrypoints, permissions, menu, triggers)
src/client/splash.tsx             inline feed view (keep light)
src/client/game.tsx               expanded view → games/<id>/
src/client/games/who-said-that/   StartScreen.tsx (more screens in Phase 2)
src/client/index.css              design tokens (light/dark)
src/server/index.ts               Hono app: /api/<game>/*, /internal/*
src/server/games/who-said-that/   routes.ts, scoring.ts(+test), sampleQuestions.ts
src/server/services/              cross-game services (dateKey.ts)
src/server/routes/, core/         Reddit menu/trigger handlers, post creation
src/shared/types/game.ts          platform types (GameId, DateKey)
src/shared/games/who-said-that/   contracts.ts: WST constants + API types
```
Folders listed in `ARCHITECTURE.md` §2 but absent (`providers/`, `engine.ts`, …) are intentionally not created yet.

## 5. Key decisions
- **Server-authoritative.** Client gets `PublicQuestion` only; `QuestionRecord` (answer) never leaves the server before reveal.
- **Redis is per subreddit.** Leaderboards are per community; keys are derivable (no scan). Key map: `ARCHITECTURE.md` §4.
- **Realtime is server→client only.** Actions go over HTTP; rounds close lazily (`tick`) or via `runJob`. `ARCHITECTURE.md` §5.
- **Content = curated comment IDs** + sanitized snapshot, re-validated daily, no authors shown. Fictional samples must be labeled. `HACKATHON_REQUIREMENTS.md` §5.
- **Server code imports with explicit `.ts`** (`allowImportingTsExtensions`) so `node --test` runs files directly.
- **New game = new folders + one `api.route`.** Extract shared services on the 2nd use, not before.
- **Design is binding:** `GAME_DESIGN.md` §5 (copy budget, tokens, no dead buttons for judges).

## 6. Done
Scaffold from the official template; demo counter removed; `devvit.json` (redis + reddit on, realtime off); start screen + splash; `GET /api/wst/meta`; `scoreRound` + 3 tests; 5 fictional sample cases; mod menu "Create Who Said That? post"; install trigger creates a post.

## 7. Not done
All of Phases 1–6: content provider, daily service, guess/hint endpoints, game screens, leaderboard, streaks, scheduler, Party Room, polish, submission. The "Start case" button is intentionally disabled.

## 8. Commands
```
npm install
npm run test:types   # tsc --build
npm run lint
npm run test:unit    # node --test src/**/*.test.ts
npm run build        # vite → dist/client, dist/server
npx devvit login     # once, interactive (human)
npm run dev          # devvit playtest (needs login; first `npx devvit upload`)
npm run deploy       # types + lint + devvit upload
```

## 9. Constraints and risks
- Serverless: 30 s/request, no websockets, no `fs`. Client cannot call external URLs. localStorage is wiped on app update.
- Redis: no lists/sets/scan/pipelining; 100 MB until published.
- **UNVERIFIED:** cross-subreddit comment reads; realtime limits; official rule text (Devpost blocked automated fetch); app name `who-said-that` availability.
- Timeline: 17 days at scaffold time. Party Room is the first cut.

## 10. Next: Phase 1 exact scope
1. Human: `npx devvit login` → `npx devvit upload` → `npm run dev`; confirm the start screen renders in the playtest post.
2. Spike: in a temporary route, `reddit.getCommentById('t1_…')` for a comment in another public sub; record result in `HACKATHON_REQUIREMENTS.md` §4.
3. `src/server/games/who-said-that/seed-cases.json`: ≥ 30 cases (schema in `DEVELOPMENT_ROADMAP.md`).
4. `src/server/providers/questions.ts`: `loadCase(seed) → QuestionRecord | null` (validate, sanitize, snapshot to `wst:q:{qid}`), fictional fallback. Pure `sanitizeCommentBody()` with tests.
5. `src/server/services/daily.ts`: `getOrCreateDaily(dateKey)` idempotent (watch/multi), re-validates cases, avoids `wst:used`.
6. Route `GET /api/wst/daily` returning `PublicQuestion[]` only. Remove the spike route.
7. Exit criteria: `DEVELOPMENT_ROADMAP.md` Phase 1 "Done when". Do **not** build UI screens in Phase 1.
