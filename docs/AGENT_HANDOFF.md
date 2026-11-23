# Agent Handoff — READ THIS FIRST

Any agent starting work on this repo reads this file first, then only the doc sections it needs. Update §2, §6, §7 and §10 at the end of every phase.

## 1. Purpose
Entry for **Reddit's Game of the Day Hackathon 2026** (deadline **2026-12-08 18:00 PT**). *Who Said That?*: read an anonymous Reddit comment, guess which of 4 subreddits wrote it. Daily Case (5 cases/day) is the core; Party Room (2–6 live) is P1; more mini-games (Reddit Courtroom) may follow. Rules: `GAME_DESIGN.md`. Judging mapping: `HACKATHON_REQUIREMENTS.md` §3.

## 2. Status (2026-11-22): Phase 1a merged (PR #10); content pipeline redesigned (Phase 1b)
Verified in Reddit playtest (haein's test app `who-said-that-haein`, r/who_said_that_hae_dev): cross-subreddit `getCommentById` works, and today's daily built 5 real cases. Typecheck, lint, 14 unit tests and build pass. Each dev tests with a personal app name in `devvit.json` (not committed); who owns the official `who-said-that` app is still undecided.

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
src/server/providers/             redditText.ts (parse/sanitize/check, pure), questions.ts (loadCase, snapshots)
src/server/services/daily.ts      getOrCreateDaily(dateKey), resetDaily
src/server/games/who-said-that/   cases.ts (pure: seed validation, seeded shuffles, candidate order), seed-cases.json
```
Folders listed in `ARCHITECTURE.md` §2 but absent (`engine.ts`, `rooms.ts`, …) are intentionally not created yet.

## 5. Key decisions
- **Server-authoritative.** Client gets `PublicQuestion` only; `QuestionRecord` (answer) never leaves the server before reveal.
- **Redis is per subreddit.** Leaderboards are per community; keys are derivable (no scan). Key map: `ARCHITECTURE.md` §4.
- **Realtime is server→client only.** Actions go over HTTP; rounds close lazily (`tick`) or via `runJob`. `ARCHITECTURE.md` §5.
- **Content = in-app harvest → moderator approval → bank**, only via the Devvit `reddit` client (no external crawling or datasets). Deletion sweep + short TTLs, no authors shown. Policy: `HACKATHON_REQUIREMENTS.md` §5; flow: `ARCHITECTURE.md` §6.
- **Server code imports with explicit `.ts`** (`allowImportingTsExtensions`) so `node --test` runs files directly.
- **New game = new folders + one `api.route`.** Extract shared services on the 2nd use, not before.
- **Design is binding:** `GAME_DESIGN.md` §5 (copy budget, tokens, no dead buttons for judges).

## 6. Done
Scaffold from the official template; demo counter removed; `devvit.json` (redis + reddit on, realtime off); start screen + splash; `GET /api/wst/meta`; `scoreRound` + 3 tests; 5 fictional sample cases; mod menu "Create Who Said That? post"; install trigger creates a post.
Phase 1 (2026-11-22): cross-sub comment read verified; `sanitizeCommentBody` / `checkCaseBody` / `parseCommentRef` + tests; `seed-cases.json` (10 cases) + validation test; `loadCase` (live re-validate, NSFW/removed/wrong-sub/length/answer-leak checks, 14 d snapshot); `getOrCreateDaily` (unused first then LRU, `set nx` for idempotency, sample fallback, `wst:used` zset); `GET /api/wst/daily` returns `PublicQuestion[]` only.

## 7. Not done
Phase 1b (harvester, review, sweep, PR #10 review fixes). Then Phases 2–6: game screens, leaderboard, streaks, scheduler rollover, Party Room, polish, submission. The "Start case" button is intentionally disabled.

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
- Cross-subreddit comment reads: verified 2026-11-22. **UNVERIFIED:** realtime limits; official rule text (Devpost blocked automated fetch); app name `who-said-that` availability.
- Timeline: 17 days at scaffold time. Party Room is the first cut.

## 10. Next
Phase 1b and Phase 2 touch different files and can run in parallel (`DEVELOPMENT_ROADMAP.md`).
1. **1b:** `subreddits.json` → `services/harvest.ts` + cron → review endpoints + screen (mods only) → bank in Redis → `services/sweep.ts` + cron → PR #10 review fixes. Follow the binding rules in `HACKATHON_REQUIREMENTS.md` §5.
2. **2:** `POST /daily/guess`, `POST /daily/hint`, player progress in `GET /daily`, client `CaseScreen` / `RevealCard` / `SummaryScreen`, enable "Start case".
3. Before submitting: ask the Devvit team about the §5 gray area, remove dev-only menu items, settle the official app name/owner.
