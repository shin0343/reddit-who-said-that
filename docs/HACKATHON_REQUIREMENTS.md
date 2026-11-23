# Hackathon Requirements — Reddit's Game of the Day Hackathon 2026

Checked 2026-11-21. Devpost pages (`redditgameofday2026.devpost.com`, `/rules`) **refused automated fetches (HTTP 403)**. Event facts below come from search-result summaries and aggregator pages that quote the rules (tierones.io, internshala.com). Anything not confirmed by two sources or by official Reddit docs is marked **UNVERIFIED**. A human must read `/rules` once before submitting (Phase 6 gate).

Devvit facts come from the official docs source repo `github.com/reddit/devvit-docs` (`docs/`, pulled 2026-11-21) and the official template `reddit/devvit-template-react` (Devvit 0.15.4).

## 1. Event facts

| Item | Value | Status |
|---|---|---|
| Submission window | 2026-11-11 12:00 PT → **2026-12-08 18:00 PT** | 2 sources agree |
| Judging / winners | Dec 9–16 / ~Dec 17 2026 | 2 sources agree |
| Eligibility | Age of majority; individuals or teams; excluded countries per rules | UNVERIFIED detail |
| Prior winners | Projects that won an earlier Reddit hackathon are ineligible | 1 source |
| One prize per project | Yes | 1 source |
| Prizes | Best Daily Game $15k · Best Ported Daily Game $6k · 10× Honorable Mention $1k · 6× Devvit Helpers $500 · 5× Feedback $200 | 2 sources agree |
| Team size / entries per team | Not stated | UNVERIFIED |

## 2. Required submission

| Deliverable | Required? | Our plan |
|---|---|---|
| App link on developers.reddit.com | Yes | `devvit upload` creates it (Phase 6) |
| README in the app root describing the game | Yes | `README.md` (rewrite for judges in Phase 6) |
| Link to a post running the game in a **public test subreddit with < 200 members** | Yes | Playtest sub created by `devvit upload`, or `devvit playtest <sub>` |
| Text description | Yes | Devpost form |
| Demo video **< 1 minute** | Optional | Record it anyway (Phase 6) |
| Public code repo | Optional | This repo |
| Must be a *new* daily game built on Devvit Web in a Reddit post | Yes | Built from scratch, Devvit Web 0.15 |

## 3. Judging criteria → what we must deliver

Four criteria, reportedly **equally weighted** (weights UNVERIFIED). Aggregator note: judges "reward a polished small game over a big build".

| Criterion | What judges look for | Who Said That? must have (P0) |
|---|---|---|
| **Delightful UX** | Instantly understandable, fun on mobile, fast | 1-tap start from feed splash; one comment + 4 big choices; reveal moment with explanation; < 3 min session |
| **Polish** | Launch quality, no bugs, Devvit Rules compliant | No dead buttons, loading/error states, dark mode, mobile layout, content labels, no policy risk |
| **Reddit-y / community-minded** | Uses Reddit culture, brings community together | The *content is* Reddit culture; "how others voted" distribution; daily leaderboard per subreddit; daily post where people argue in comments |
| **Fresh recurring content** | A reason to come back every day | New 5-case set every UTC day via scheduler; streaks; new daily post |

## 4. Devvit Web platform facts (verified in official docs)

| Topic | Fact | Source (devvit-docs/docs/…) |
|---|---|---|
| Scaffolding | Official React template: Vite + React 19 + Tailwind 4 + Hono server, Node ≥ 24 | template repo |
| Entry points | `splash.html` inline in feed (keep light) → `requestExpandedMode(e, 'game')` → `game.html` | template, `view_modes_entry_points.md` |
| Client ↔ server | Client `fetch('/api/...')` only; server is serverless Node | `devvit_web_overview.mdx` |
| Server limits | 30 s max request, 4 MB payload, 10 MB response; **no websockets/streaming**; no `fs`/native packages | `devvit_web_overview.mdx` |
| Client limits | No external requests from the client (CSP); no `window.alert` (use `showToast`); no inline `<script>`; **localStorage is wiped on every app update** | same + template `AGENTS.md` |
| Redis | Strings, hashes, **sorted sets**, numbers, bitfields, transactions. **No lists, no plain sets, no key scan, no pipelining.** 5 MB request; 100 MB storage unpublished / 5 GB published; transactions 5 s timeout (20 or 30 concurrent — docs disagree) | `redis.mdx` |
| Redis scope | **Per installation (= per subreddit).** Cross-subreddit data (global leaderboard) needs an external service via HTTP Fetch | `redis.mdx` |
| Realtime | Client `connectRealtime({channel, onMessage})`; server `realtime.send(channel, json)`. **Server → client only**; clients send via HTTP. Channel names cannot contain `:`. Needs `permissions.realtime: true`. Message size / rate limits: UNVERIFIED | `realtime/overview.md` |
| Scheduler | `devvit.json` `scheduler.tasks` with `cron` (endpoint must be `/internal/...`), or `scheduler.runJob()` one-offs. Max **10 live recurring jobs**, `runJob` ≤ 60 calls/min | `scheduler.mdx` |
| Reddit API | `reddit` from `@devvit/web/server`; `getCommentById`, `getComments({postId})`, `getTopPosts`, `searchPosts`, `submitCustomPost`, `submitComment`. Enabled via `permissions.reddit` | `reddit-api.mdx` |
| Reading comments from **other** public subreddits | **Works.** 2026-11-22 playtest: `reddit.getCommentById('t1_19t18x17gil8l')` from r/castiron returned body, `subredditName`, `removed`, `score`. Comment IDs can be 13+ chars. `/s/` share short-links contain no comment ID | Phase 1 spike ✅ |
| Triggers | `onCommentDelete` etc. exist, but fire for the installed subreddit only (assumed) | `devvit_web_configuration.md` (scope UNVERIFIED) |
| HTTP Fetch / LLMs | Premium features: need app review, domain allowlist, own ToS + privacy policy | `devvit_rules.md` |
| Playtest | `devvit upload` → auto playtest sub; `devvit playtest [sub]` (sub < 200 members); live-reloads on save | `guides/tools/playtest.md` |
| App review / publish | ~1 week; needed for App Directory, not for playtest. Whether the hackathon requires publishing: UNVERIFIED | `devvit_rules.md` |
| App name | 3–20 chars, `^[a-z][a-z0-9-]*$`; must be globally unique. `who-said-that` availability UNVERIFIED | `devvit_web_configuration.md` |

## 5. Reddit content reuse: policy check (2026-11-22)

Primary source: Devvit Rules (`devvit-docs/docs/devvit_rules.md`, rev 2026-11-16). Reddit's Developer Terms, Data API Terms and Public Content Policy pages refuse automated fetches; anything from them below came from secondary sources and is **UNVERIFIED**.

| Approach | Verdict | Why |
|---|---|---|
| External crawler/scraper of reddit.com | **Not allowed** | User Agreement reportedly forbids scraping without Reddit's prior written consent (UNVERIFIED, secondary source) |
| Third-party dump datasets | **Not allowed** | Can't honor deletions; ownership and licence unclear |
| In-app reads via the Devvit `reddit` client, shown in the game | **Allowed, with conditions** | "your app may copy and display existing Reddit user content and modify it for display, but only in compliance with Reddit's Developer Terms" |

Conditions (quoted from Devvit Rules):
- **Deletion:** "you are required to remove any user content that has been deleted from Reddit, including from your Devvit app(s)". "Metadata required for contextualizing related content (for example, post or comment ID, createdAt, etc.) may be retained." "Any retention of content and data that has been deleted, even if disassociated, de-identified or anonymized, is a violation."
- **Retention:** "we recommend deleting any stored user data within 30 days".
- **Minimization:** "only use data necessary for your app's stated functionality".
- **Never:** sell/licence/share data, train ML or LLMs on it, profile, surveil, re-identify redditors.
- **Mature content** must be labeled or age-gated. We exclude NSFW entirely.
- **Gray area:** "Ask redditors for their permission if you want to use existing user content in ways they might not expect". The rules don't say whether an anonymous cross-community quiz counts. Mitigations are rules 4–7 below; ask the Devvit team before submitting (§6).

Binding rules for the content pipeline:
1. Read Reddit only through the Devvit `reddit` client, inside the app. No external crawlers, datasets or LLMs.
2. Harvest small: whitelisted public SFW subreddits, bounded batches. Rejected text is dropped immediately; only the comment ID is kept (to avoid re-harvesting).
3. A moderator approves every case before it can be served.
4. Never store or show author names or IDs. Strip `u/`, `r/` and links.
5. **Deletion sweep.** Delete triggers fire only for the installed subreddit, so a scheduled job re-checks every stored comment and thread text (candidates, bank snapshots) via `getCommentById`/`getPostById`. Deleted or removed → delete the text immediately, keep the ID. Re-check again right before a day goes live.
6. TTLs: candidates 3 d, snapshots 7 d, daily/progress 30 d. No comment text is stored longer than 30 d.
7. After reveal, link to the original comment (credit to the author's community).
8. Fictional samples are labeled "Sample case". No "guess the user" features.

## 6. Open items (owner: human, before Phase 6)

- [ ] Read official `/rules` page: confirm criteria weights, team rules, whether app must be published or only uploaded, video rules.
- [ ] Ask the Devvit team (r/Devvit or Discord) whether the anonymous cross-subreddit quiz needs author consent (§5 gray area); record the answer here.
- [ ] `devvit login` and confirm app name `who-said-that` is available (else rename in `devvit.json` + `package.json`).
- [x] Confirm cross-subreddit `getCommentById` works in playtest (Phase 1 spike, 2026-11-22: works).
