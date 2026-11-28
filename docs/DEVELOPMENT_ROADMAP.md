# Development Roadmap

Deadline **2026-12-08 18:00 PT**. Target submit **Dec 7** (1-day buffer). Dates are targets; if behind, cut P1 (Party Room) before touching Daily polish. New mini-games may be inserted between phases: follow `ARCHITECTURE.md` §7 and never start one before Phase 2 is done.

| Phase | Name | Target |
|---|---|---|
| 1a | Engine skeleton + comment provider ✅ (PR #10) | Nov 22 |
| 1b | Harvester, moderator review, deletion sweep | Nov 23–25 (parallel with 2) |
| 2 | Daily Case implemented locally; Reddit playtest pending | Nov 25–28 |
| 3 | Party Room implemented locally; Reddit playtest pending (P1) | Nov 29–Dec 2 |
| 4 | Daily community results and approved bank implemented locally | Dec 1–3 (overlaps 3) |
| 4.5 | 100 authored cases and playable localhost demo | Local |
| 5 | UI/UX polish, optional 3D/motion | Dec 4–5 |
| 6 | QA, real-device Reddit testing, Devpost submission | Dec 6–7 |

---

### Phase 1a: Engine skeleton and comment provider ✅
Done 2026-11-22 (PR #10): cross-sub reads verified, sanitizer, `loadCase`, `getOrCreateDaily`, `GET /api/wst/daily`, 10 seed cases.

### Phase 1b: Harvester, review, sweep
- **Goal:** enough approved, policy-compliant cases: **≥ 100 by Dec 1, ≥ 150 by Dec 7** (5/day through judging + Party pool).
- **Build:** `subreddits.json` (~40 SFW subs, families, blurbs); `services/harvest.ts` + cron; review screen + `POST /api/wst/review/{approve,skip}` (mods only); bank in Redis (`wst:case`, `wst:bank`) with seeds imported; `services/sweep.ts` + cron; mod "Remove case". Fix PR #10 review notes: `parseCommentRef` 13+ char IDs, thread-title answer leak, snapshot TTL 14 d → 7 d, re-check stored days on read.
- **Prereq:** 1a. Files differ from Phase 2, so both can run in parallel.
- **Risks:** Reddit API rate limits (UNVERIFIED) → small batches; too many low-quality candidates → stricter filters (score floor, length); policy gray area (`HACKATHON_REQUIREMENTS.md` §5).
- **Done when:** in playtest, a harvest run fills the queue; a mod approves 5 and they appear in a rebuilt day; deleting a test comment removes its text within one sweep; tests green.

### Phase 2: Daily Case playable
- **Goal:** a stranger can play 5 cases end-to-end on mobile.
- `POST /api/wst/daily/play` supports open/resume, guess, hint, and next. Shared case and reveal cards, scored summary, and distributions are available in the local build.
- **Prereq:** Phase 1.
- **Risks:** speed-bonus timing fairness (server `issuedAt`); double submits.
- **Done when:** full run in playtest on phone + desktop; refresh mid-run resumes; second attempt is not scored; answers absent from all pre-reveal payloads (check network tab).

### Phase 3: Party Room (P1)

- Room codes, lobby and readiness, two to six authenticated accounts, five 20-second rounds, shared hints and scoring, group reveal, standings, reconnect, and installation flag are implemented. Changes broadcast versions over Devvit Realtime; snapshot fetches and request-driven deadline updates cover delivery gaps.
- Party uses five labeled sample cases exclusive to the mode. Phase 1b is the dependency for moderator-approved Party-only Reddit comments.
- **Done when:** two Reddit accounts complete a room on the same test post, recover from a disconnect, see the same final standings, and verify host transfer.

### Phase 4: Daily content, leaderboard, community

- Implemented UTC rollover and preparation, immutable packs, labeled Practice, approved case preview and withdrawal, source deletion handling, and isolated Party selection.
- Official results include one ranked completion per day, top 10, personal rank, sample-gated community distributions, rolling 30-day streak and best score, spoiler-free copy, and a UTC countdown.
- Native Reddit and permission-confirmed content remain release gates. Target 35 approved Daily comments for 7 distinct packs or 70 for 14, plus five Party-only comments.
- Optional weekly leaderboard, community nominations, and recurring posts remain open. Existing interactive posts always open the current UTC pack.

### Phase 4.5: Content acquisition and demo

- 70 Daily, 25 Party, and five Practice cases are playable. Fictional Daily records, distributions and streaks are isolated from Verified Daily.
- `npm run demo` is the local demo entry point. `npm run validate:content` checks the dataset, rotation and available browser bundles.
- Authors can opt in and withdraw through the app. Moderator preview and approval remain required. The ten legacy references await verified permission. Live Reddit API checks and playtest await Devvit CLI login.

### Phase 5: Premium game design and polish

- **Implemented locally.** Original case-folder mascot, paper-and-ink design system, community mode branding, Evidence Board, animated reveal, Daily report, and player status and standings for Party.
- **Verified locally.** Alice and Bob played the five-round Party and reconnected mid-game. Tutorial, the ranked Daily, sharing, and standings passed in Chromium. Six viewport widths, light and dark, keyboard focus, and reduced motion were checked. See [art direction and before/after captures](ART_DIRECTION.md).
- **Platform BLOCKED.** Devvit CLI is signed out. Live Reddit WebView, native realtime, and outside tester runs remain for Phase 6.

### Phase 6: QA and submission
- **Local checks complete:** 36 unit tests, production build, content and spoiler validation, Chromium and WebKit QA, English submission copy and screenshots.
- **Release gate blocked:** owner authentication, live Reddit acceptance and verified app/subreddit/post links.
- **Done when:** the interactive post is verified on the installed candidate and the owner approves the Devpost entry. The demo video and public repo are optional. See the [release checklist](RELEASE_CHECKLIST.md).

---

`src/server/games/who-said-that/seed-cases.json` schema (Phase 1):

```json
{ "id": "c-001", "commentId": "t1_xxxxx", "answer": "castiron",
  "distractors": ["Cooking", "BuyItForLife", "mildlyinfuriating"],
  "explanation": "Seasoning talk is cast-iron gospel.", "addedBy": "dev" }
```
