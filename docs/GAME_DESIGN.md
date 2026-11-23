# Game Design — Who Said That?

Constants referenced here live in `src/shared/games/who-said-that/contracts.ts` (`WST`). If this doc and the code disagree, fix one of them in the same PR.

## 1. Core gameplay

**One-liner:** *Read one anonymous Reddit comment, pick which of four subreddits wrote it.*

**Target players:** Redditors who know at least a few communities: casual daily-puzzle players (Wordle crowd) and heavy users who enjoy "only on r/X" humor.

**Three core pleasures**
1. **Recognition.** "That's *so* r/castiron." Knowing a community's voice feels like insider knowledge.
2. **Reveal.** A one-line explanation of *why* it's that community, plus how everyone else voted.
3. **Comparison.** Your score vs. the sub's leaderboard, and arguing about tricky cases in the post's comments.

**Loop:** feed splash → expand → 5 cases → summary (score, distribution, rank) → share/discuss → come back tomorrow.

### Daily Case rules

- 5 cases per UTC day, identical for everyone in the subreddit. One **scored** attempt per user per day; progress resumes if they leave mid-run.
- Each case: comment body + 4 subreddit choices (1 answer, 3 distractors). Distractors are hand-picked: two plausible "same vibe" subs, one easier one. Order is shuffled server-side.
- Time is soft: no hard timer in Daily, but a speed bonus rewards answering within 20 s (measured server-side from when the case was issued).
- Hints (max 2 per case, each kind once):
  - **Thread title**: shows the title of the post the comment replied to.
  - **Eliminate one**: removes one wrong choice.

### Scoring (server-authoritative, `scoreRound`)

| Event | Points |
|---|---|
| Correct | 100 |
| Speed bonus | + up to 50, linear from 0 s to 20 s |
| Each hint used | −30 |
| Floor for a correct answer | 10 |
| Wrong | 0 |

Max per day = 750. Ties on the leaderboard break by earlier completion time.

### Reveal

After each guess the server returns: correct answer, points, a one-sentence explanation, and the vote distribution so far (% per choice). The original thread link is shown **only** after reveal. Author names are never shown.

### Completion and return

Summary card: total, per-case ✓/✗ strip (emoji, spoiler-free, copyable), rank in this subreddit today, streak, countdown to next case. Returning players who already finished see the summary, not a replay.

## 2. Multiplayer — Party Room (design only; build in Phase 3)

| Topic | Rule |
|---|---|
| Create | Any logged-in user creates a room from the expanded view → 4-letter code; creator is host. Room lives 2 h (Redis TTL). |
| Join / ready | 2–6 players join by code. Each toggles Ready. Host can start when ≥ 2 players are ready. Late joiners after start watch as spectators. |
| Rounds | 5 rounds from a question pool *not* used in today's Daily. 20 s guess window, then 5 s reveal. Hints disabled (keeps rounds simultaneous). |
| Sync | Server stores `endsAt` per round and broadcasts it; clients render countdown from that timestamp. Round closes when all active players have answered **or** at `endsAt`, whichever first. |
| Scoring | Same `scoreRound`, elapsed measured from server `startedAt`. Server is the only judge; clients only submit choices. |
| Results | Per-round reveal shows each player's pick; final screen shows ranking and winner. |
| Disconnects | A player who misses a round scores 0 for it. Rejoining with the same account restores their seat and score. If the host leaves, host passes to the earliest-joined remaining player. Room ends if < 2 players remain. |

## 3. Reddit integration

- **Content:** real comments from whitelisted public SFW subreddits, harvested in-app and **approved by the host subreddit's moderators** (policy: `HACKATHON_REQUIREMENTS.md` §5). Fictional labeled samples are the last fallback.
- **Community culture:** each case's explanation names the in-joke, slang, or tone that gives it away. This is the learning moment.
- **Vote distribution:** live % per choice, per case.
- **Daily challenge:** the scheduler posts a new "Case #N" post each day in the host subreddit, so every day has its own comment thread for discussion.
- **Community leaderboard:** per subreddit (Redis is per installation). Cross-subreddit leaderboard is P2.
- **Share/discuss:** copy a spoiler-free result strip; optional one-tap "post my result as a comment" (P1, uses `submitComment`, must look like the user's own content and stay low-frequency).

## 4. MVP scope

**P0: must ship before the 2026-12-08 deadline**
- Daily Case: 5 cases, 4 choices, both hints, server scoring, reveal + explanation, distribution, summary.
- Content pipeline: in-app harvester, moderator review (Approve / Skip / Remove), daily deletion sweep; bank ≥ 100 approved cases by Dec 1; fictional fallback labeled.
- Scheduler daily rollover + daily post; lazy-create fallback if the job didn't run.
- Daily leaderboard (top 10 + your rank) and streak.
- Splash with today's state; mobile + dark mode; loading/error states.

**P1: if time allows**
- Party Room (Phase 3). This is the first P1 to cut if Daily isn't polished.
- Moderator tools beyond review: add a case from a comment link, edit an explanation.
- Share as comment; all-time leaderboard; "hardest case today" stat.

**P2: future**
- 3D lobby, avatars, elaborate animations.
- Reddit Courtroom and other mini-games.
- Cross-subreddit/global leaderboard (needs an external service).
- Community-submitted cases.

## 5. Design principles (binding for every contributor)

Refined, modern, highly readable. **Text never piles up.**
- Copy budget: ≤ 12 words of instruction per screen; explanation ≤ 1 sentence; no paragraphs in-game.
- One primary action per screen. Big tap targets (≥ 44 px). Comment text is the hero; everything else is quiet.
- Colors only via CSS tokens in `src/client/index.css`; light and dark both tested.
- No dead buttons in a build that goes to judges; unfinished features are hidden, not disabled.
