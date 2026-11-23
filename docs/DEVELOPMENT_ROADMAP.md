# Development Roadmap

Deadline **2026-12-08 18:00 PT**. Target submit **Dec 7** (1-day buffer). Dates are targets; if behind, cut P1 (Party Room) before touching Daily polish. New mini-games may be inserted between phases: follow `ARCHITECTURE.md` §7 and never start one before Phase 2 is done.

| Phase | Name | Target |
|---|---|---|
| 1a | Engine skeleton + comment provider ✅ (PR #10) | Nov 22 |
| 1b | Harvester, moderator review, deletion sweep | Nov 23–25 (parallel with 2) |
| 2 | Who Said That? fully playable Daily Case | Nov 25–28 |
| 3 | Realtime multiplayer Party Room (P1) | Nov 29–Dec 2 |
| 4 | Daily content, leaderboard, community | Dec 1–3 (overlaps 3) |
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
- **Build:** `POST /daily/guess`, `POST /daily/hint`, engine transitions, distribution counts; client screens `CaseScreen`, `RevealCard`, `SummaryScreen`; resume mid-run; splash shows today's state.
- **Prereq:** Phase 1.
- **Risks:** speed-bonus timing fairness (server `issuedAt`); double submits.
- **Done when:** full run in playtest on phone + desktop; refresh mid-run resumes; second attempt is not scored; answers absent from all pre-reveal payloads (check network tab).

### Phase 3: Party Room (P1)
- **Goal:** 2–6 people play the same 5 rounds live.
- **Build:** `permissions.realtime: true`; `services/rooms.ts`; `/party/*` routes; `tick` + `runJob` backstop; client `Lobby`, `PartyRound`, `PartyResults`, `useRoomChannel` hook (seq + snapshot resync).
- **Prereq:** Phase 2 engine + scoring.
- **Risks:** realtime limits UNVERIFIED; races on round close (use transactions); can't test 6 real accounts easily (use 2 accounts + alt devices).
- **Done when:** 2 accounts complete a room; one disconnects and rejoins with score intact; host leave hands off.

### Phase 4: Daily content, leaderboard, community
- **Goal:** a reason to return every day.
- **Build:** scheduler cron `/internal/scheduler/daily-rollover` (create day + new post); `services/leaderboard.ts` (today top 10 + my rank); streaks; share strip copy; mod menu "Add case" / "Remove case" (P1).
- **Prereq:** Phase 2.
- **Risks:** cron runs only once installed; bank exhaustion (alert when < 7 days left).
- **Done when:** day rolls over automatically in playtest; new post appears; leaderboard ranks two accounts correctly.

### Phase 5: Polish
- **Goal:** launch quality per `GAME_DESIGN.md` §5.
- **Build:** reveal animation, haptic-feeling transitions, empty/error/loading states, accessibility (contrast, focus), copy pass within budget. 3D only if everything else is done (P2).
- **Done when:** no dead UI; 3 outside testers finish without help.

### Phase 6: QA and submission
- **Build:** QA checklist run; README for judges; < 1 min video; Devpost text; public post in < 200-member test sub.
- **Prereq:** human reads official `/rules` (open items in `HACKATHON_REQUIREMENTS.md` §6).
- **Done when:** Devpost submitted with app link, post link, README, description (+ video, repo).

---

`src/server/games/who-said-that/seed-cases.json` schema (Phase 1):

```json
{ "id": "c-001", "commentId": "t1_xxxxx", "answer": "castiron",
  "distractors": ["Cooking", "BuyItForLife", "mildlyinfuriating"],
  "explanation": "Seasoning talk is cast-iron gospel.", "addedBy": "dev" }
```
