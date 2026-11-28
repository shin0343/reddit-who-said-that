# Agent Handoff — READ THIS FIRST

Any agent starting work on this repo reads this file first, then only the doc sections it needs. Update §2, §6, §7 and §10 at the end of every phase.

## 1. Purpose
Entry for **Reddit's Game of the Day Hackathon 2026** (deadline **2026-12-08 18:00 PT**). *Who Said That?*: read an anonymous Reddit comment, guess which of 4 subreddits wrote it. Daily Case (5 cases/day) is the core; Party Room (2–6 live) is P1; more mini-games (Reddit Courtroom) may follow. Rules: `GAME_DESIGN.md`. Judging mapping: `HACKATHON_REQUIREMENTS.md` §3.

## 2. Step 6 candidate installed on Reddit

The Step 6 candidate includes Phases 2–5 and the local QA fixes. Community Detective is the original fictional mode. Real Case Files uses permission-verified Reddit comments when a pool can fill a game. There are zero approved Reddit comments. Devvit 0.0.1 is installed and the owner verified Daily. The test subreddit is now public and the existing post opens signed out. Ordinary signed-in gameplay and two-account Party remain open. [Release checklist](RELEASE_CHECKLIST.md) and [test report](TEST_REPORT.md) record the release gate and verified candidate.

## 3. Stack (fixed)
Devvit Web 0.15.4 (official `devvit-template-react`), React 19, TS 6, Vite 8, Tailwind 4, Hono server, Devvit Redis / Realtime / Scheduler. Node ≥ 24. No tRPC, no external DB, no HTTP Fetch (it would trigger app review + a privacy policy).

## 4. Layout
```
devvit.json                       app config (name, entrypoints, permissions, menu, triggers)
src/client/splash.tsx             inline feed view (keep light)
src/client/game.tsx               expanded view → games/<id>/
src/client/games/who-said-that/   StartScreen, DailyScreen, PartyScreen, shared case cards and room subscription
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
`dailyPlay.ts` and `rooms.ts` own mode-specific state and use the shared `round.ts` and `scoring.ts`. `partyRoutes.ts` provides the Party API and reads the installation feature flag.

## 5. Key decisions
- **Server-authoritative.** Client gets `PublicQuestion` only; `QuestionRecord` (answer) never leaves the server before reveal.
- **Redis is per subreddit.** Leaderboards are per community; keys are derivable (no scan). Key map: `ARCHITECTURE.md` §4.
- **Realtime is server→client only.** Actions go over HTTP; rounds advance lazily through member requests. `ARCHITECTURE.md` §5.
- **Content = known comment ID → permission check and moderator preview → bank**, only via the Devvit `reddit` client (no external crawling or datasets). Deletion sweep + short TTLs, no authors shown. Policy: `HACKATHON_REQUIREMENTS.md` §5; flow: `ARCHITECTURE.md` §6.
- **Server code imports with explicit `.ts`** (`allowImportingTsExtensions`) so `node --test` runs files directly.
- **New game = new folders + one `api.route`.** Extract shared services on the 2nd use, not before.
- **Design is binding:** `GAME_DESIGN.md` §5 (copy budget, tokens, no dead buttons for judges).

## 6. Done

- Daily supports one scored run per UTC day, hints, immutable guesses, resumption, and ranked completion. UTC packs freeze their five slots. Low supply selects a labeled Fictional Daily pack with its own rankings and statistics. Source withdrawal preserves slot order, withholds removed content, and makes the affected day unranked.
- Daily results include the anonymous top 10, personal rank, shares of completed guesses, hardest case, higher-than percentage, and 30-day best score and streak. Community distributions and percentile require five finishers in that day’s ranked mode. Result copy is explicit.
- Moderators can validate, preview, approve, withdraw, and count approved comments for each exclusive pool. The scheduler prepares tomorrow, activates today's pack, and revalidates a bounded rotating batch. Installation comment and post deletion triggers remove snapshots. Party uses five approved Party cases when available and closes safely if an active source is withdrawn.
- Self-service and moderator-verified deletion remove Daily records and tracked Party identities. Devvit Web 0.15.4 has no account-deletion trigger. New Daily records expire within 30 days, and pre-index Party rooms expire within two hours.
- Local Hono + Redis verification used mocked Devvit identity, content, and transport. It covered access control, approval, scheduler retries, cross-subreddit sweep, deletion handlers, duplicate completion, spoiler gating and account cleanup. The 390 px browser flow finished five rounds, showed community results, and displayed the manual-copy fallback when clipboard access was unavailable.

- Fictional Daily has 70 cases in fourteen non-overlapping UTC packs. Party has 25 cases in five rotating groups. Practice has five separate tutorial cases. Every authored case carries two server-gated hints and has no source link or comment ID.
- Authors can grant or withdraw permission for a comment after Devvit verifies ownership. A moderator still checks suitability and approves. For permission obtained elsewhere, the moderator records a receipt ID referencing explicit author consent. Approval and revalidation honor an author withdrawal.
- The localhost demo runs the Hono routes and browser bundles against isolated mock identities, storage, and Realtime. `npm run demo` completed a 390 px Fictional Daily and a two-browser Party with matching cases and ranks. Separate demo fixture submissions verified the distribution threshold. The unit suite has 34 tests.

- Phase 5 gives the feed and main menu an original SVG mascot and case-folder wordmark. Daily, Tutorial, and Party share the Evidence Board, explicit lock-in, progress, clue labels, and animated reveal. The Daily brief and leaderboard use separate GET routes without opening a timed round or returning answers. The five-finisher threshold still governs community deductions and percentile.
- Node 24 checks passed with 34 unit tests, 100 authored cases, a spoiler scan of the browser build, and local Devvit schema and entrypoint validation. Alice and Bob finished a five-round browser Party after a mid-game reload. Tutorial, Daily, result sharing, standings, and responsive captures are documented in [Art Direction](ART_DIRECTION.md).

- Step 6 reviewed 100 fictional cases and tested the December 8–17 UTC rotation. Local Chromium and WebKit tests passed. The 36-test suite includes judging-date and Party capacity coverage. The browser bundle remains 88,270 B gzip. Release documents and screenshot candidates are ready for live evidence.

- Live Reddit verified the inline preview, expanded game, Fictional Daily five-round completion, clue, recovery and leaderboard. The Party lobby reported Live with one player.

## 7. Pending verification and work

Authentication and installation are complete. Use the verified links and version in the release checklist. Verify independent access, two-account Party and native Realtime, hosted scheduling, account deletion intake, and mobile Reddit WebView.

There are ten legacy Reddit comment references and no current permission-confirmed approvals. Phase 1a verified a cross-subreddit read in its playtest. The legacy seeds are candidates only. Obtain source permission, then approve 35 distinct Daily comments for 7 days or 70 for 14, plus at least five distinct Party comments. Confirm the production account-deletion intake with Reddit before publishing.

## 8. Commands
```
npm install
npm run test:types   # tsc --build
npm run lint
npm run test:unit    # node --test src/**/*.test.ts
npm run build        # vite → dist/client, dist/server
npm run validate:content
npm run demo
npx devvit login     # once, interactive (human)
npm run dev          # devvit playtest (needs login; first `npx devvit upload`)
npm run deploy       # types + lint + devvit upload
```

## 9. Constraints and risks
- Serverless: 30 s/request, no websockets, no `fs`. Client cannot call external URLs. localStorage is wiped on app update.
- Redis: no lists/sets/scan/pipelining; 100 MB until published.
- Cross-subreddit comment reads verified 2026-11-22. The official rules confirm Dec 8 at 18:00 PT and the four equally weighted criteria. Live realtime limits and app name availability remain unverified.
- Timeline: 17 days at scaffold time. Party Room is the first cut.

## 10. Next

1. Public visibility is confirmed. Open the existing post as a signed-in non-moderator. Keep the Admin Helper installed.
2. Playtest and verify the final installation from two ordinary accounts and a physical mobile Reddit app. Record the listing, test subreddit and post links. Confirm the live account-deletion intake.
3. Review the English [Devpost copy](DEVPOST_SUBMISSION.md) with the actual links. Submit only with owner approval. See the release checklist for judge access and the deadline freeze.
