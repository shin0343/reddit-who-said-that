# Step 6 test report

**Test window:** November 27, 2026 PST. **Candidate:** working tree based on `455ca88479a68f3e1694094a7bed23836d8da1d4`. Local QA used Node 24.0.2 and Devvit 0.15.4. The shell initially reported Node 22.15.1. This run used the installed Node 24 binary. The repo pins Node 24.18.0 in `.nvmrc` and CI.

## Step 6.1 platform status

`npx devvit whoami` passed after browser approval. Devvit uploaded and installed **0.0.1** from commit `804a1c14303eb0410dcca2d37008d51b4873e7b8` with app registration metadata updated by the CLI. The install trigger created the [Interactive Post](https://www.reddit.com/r/who_said_that_jh__dev/comments/1y78hfj/who_said_that_todays_case/). Verified in desktop Reddit on the owner account.

- The inline preview expanded into the game. Fictional Daily completed five rounds. Correct and incorrect reveals appeared. A clue was opened, and reopening the mode restored the revealed round. The leaderboard displayed one finisher, four solved, **510 points**, and rank **1**. The results included the Streak section and UTC countdown.
- Party creation and the 1/6 lobby passed. The client reported **Live**. Two-account gameplay, Realtime message delivery, polling recovery and final rank agreement remain unverified.
- The test community is private and signed-out access is denied. Devvit Admin Helper 0.0.6 is installed. Direct judge access and access from an independent Reddit account remain unverified. No public visibility changes were made.
- The Step 6 local results below are historical evidence. This pass used Devvit's upload build and the live installation.

## Step 6.5 public access and operations

- Reviewed the subreddit before visibility changed. Its only post was the Interactive Post with Reddit's standard old-Reddit fallback body. It had zero comments and no additional test posts.
- The owner authorized a private-to-public change. Submitted the request in Reddit Mod Tools. Reddit reported `public` and two members after the change. An independent, signed-out browser opened the same [Demo Post](https://www.reddit.com/r/who_said_that_jh__dev/comments/1y78hfj/who_said_that_todays_case/). The [App Listing](https://developers.reddit.com/apps/who-said-that-jh-hi) responded to the authenticated Devvit CLI. Devvit still listed the game at **0.0.1** and the Admin Helper at **0.0.6**.
- The public host lobby opened with one seat, **Live** status and Start Game disabled until a guest could ready up. A second signed-in non-moderator session was unavailable at this checkpoint. Ordinary-account Daily, a five-round Party match, cross-account Realtime events, reconnect and polling recovery are still pending.
- The upload-build fingerprint matches the server output for the recorded gameplay commit. The saved client and server bundles contain no localhost identity or transport markers. The registered app slug and default subreddit are Devvit metadata changes. No gameplay source changed and no new version was uploaded.
- In the live moderator session, **Game data** opened the deletion confirmation, **Contribute a comment** opened the opt-in form, and **Content curation** reported zero approved comments. The check preserved existing data. Ordinary-account permission separation and deletion execution are unverified.
- The live Daily used the November 28 UTC fictional pack and displayed the UTC countdown. Scheduler jobs are present in the uploaded configuration, but the historical installation log showed no Scheduler execution signals. The next UTC rollover was not observed. The previously verified rotation covers the judging window. No Reddit comment was contributed or approved.

### Manual second-account and device checks

1. In a browser session signed in as a non-moderator, open the public Demo Post and select **Open today’s case**. Confirm the fictional label and the absence of **Content curation**. Play all five Daily rounds and confirm the report can be reopened.
2. In the host browser, open **Multiplayer Party** and create a room. In the second browser, enter the host's current code and select **Ready up**. Start on the host. Compare the five comments and timers, deliberately choose different options, and record the reveal, vote distribution, and points after each round.
3. During a round, refresh one browser and check that it keeps its seat, round and submitted guess. Verify the other account sees changes promptly while Live. Interrupt Realtime for one session, confirm polling updates while it shows Syncing, then restore connectivity. Compare the final rank and score on both screens.
4. On a physical Android or iOS Reddit app, open the same post. Verify inline and expanded views, touch targets and scrolling with a long comment, hints, Lock In and reveal across a five-round Daily, sharing, and the Party lobby or match. Mark the device, app version and each observed outcome. **Physical device status: NOT TESTED.**
5. At the next UTC midnight, compare the before and after pack and review the hosted Scheduler logs. Record both the date change and any direct evidence of scheduled execution. Game data deletion can be tested with a designated account whose test progress may be erased.

## Release verification

| Check | Result | Evidence |
| --- | --- | --- |
| Typecheck and ESLint | PASS | `npm run test:types` and `npm run lint` |
| Production build | PASS | `npm run build`, client and server artifacts |
| Unit tests | PASS | `npm run test:unit` after build. 36 passed, 0 failed, 0 skipped. Includes two new tests for the judging-date rotation and the Party capacity and retry limit |
| Content and spoilers | PASS | `npm run validate:content` after build. 4 passed, including the browser JS and source-map scan for authored body, title, hints, explanation and IDs |
| Devvit configuration | PASS | Pinned CLI schema parser, both HTML entrypoints and built server entry verified locally |
| Bundle and environment | PASS | 286,252 B raw and 88,270 B gzip for client JS and CSS with default gzip settings, identical to Step 5. Built client and server were scanned for the localhost identity and transport markers |
| Git hygiene | PASS | `git diff --check`. Pre-existing changes retained. No credential files or recognized key/token signatures found in the worktree and local Git history by a pattern scan |

## Gameplay

| Area | Local evidence | Reddit status |
| --- | --- | --- |
| Tutorial | First launch, five rounds including a clue and both reveal outcomes, then Tutorial completion with a Daily entry point. Independent unranked state verified in unit tests | BLOCKED |
| Daily | Five rounds, wrong and correct reveals, server-controlled hint penalty and scoring, resume after refresh, one ranked completion per account and mode, streak, share text and UI fallback, next-Daily countdown | BLOCKED |
| Party | Two isolated browser sessions finished five rounds and agreed on final standings. Tested create/join, Ready, member submission status, round reveals, actual local participant votes and reload of a locked answer. Guest transport was interrupted for polling recovery. Unit tests cover two through six players, host authorization, leave/host transfer, deadline and double-submit protection | BLOCKED |
| Community Intelligence | Browser check at one finisher, then five completed local fixture runs. Verified leaderboard count and hardest-case display. Unit tests verify ranked eligibility, percentile, distribution, same-mode separation and spoiler gating | BLOCKED |
| Responsive | Chromium viewport checks in both schemes at 320, 375, 390, 430, 768 and 1440 px. Keyboard focus, reduced motion, 44 px controls, long-text overflow and scrolling to Lock In with a temporary layout fixture. Desktop WebKit with iPhone 13 emulation passed feed render, touch, clue, reveal and reload resume | BLOCKED on native mobile |
| Curation and contribution | Locally verified empty curation, moderator permission and handling of an unavailable comment. Unit tests use synthetic consent and approved records to cover status changes and withdrawal. No author or source was contacted or enrolled | BLOCKED for live consent/deletion |
| External testers | No non-developer play sessions or feedback collected | NOT TESTED |

The localhost browser sessions use mock identities, an in-memory store and a Devvit transport bridge. The five- and six-player checks are local QA. Share checks simulated successful clipboard access and a denied write. Native clipboard and social feedback remain unverified.

## Defensive review

- The production app imports Devvit's server context and capability clients. Local identity headers, query switches and mock moderator settings exist only in `tools/`. Production routes derive identity from Devvit and recheck subreddit moderators before curation, post creation and moderator data removal. Internal routes are scheduler, menu and lifecycle handlers. Their access boundary needs a hosted check.
- Daily and Party validate request input, membership or identity, round and timing. Round issuance and hint penalties use server state. Public question objects carry choices and the excerpt. Answers and explanations stay server-side until reveal. React renders text through normal escaping and approved source URLs come from the validated Reddit provider.
- Redis WATCH protects scores and progress together, and writes retry on conflicts. P1 fixes release read-only watches with UNWATCH and bound the number of unexpired room records indexed per account to 24, including creation and joins. Request replay remains idempotent and the host's retry key is preserved when rejoining a lobby. The limit bounds stored records. A separate request-level Party join rate limit is absent. Random room codes carry 60 bits, expired rooms are rejected, and snapshots are membership-gated. Hosted conflict behavior and platform rate caps remain unverified.
- Realtime payloads carry a version, and the client ignores obsolete notifications and refreshes from the server. Daily pack selection is idempotent. Account deletion and content withdrawal have local unit coverage. Hosted deletion delivery and privacy operations are open in [Known limitations](KNOWN_LIMITATIONS.md).
- Post creation now uses the Devvit Post permalink for navigation. The CI workflow now uses valid sequential steps and validates the built client. GitHub-hosted CI and the real subreddit menu are pending.
- Dependency versions are pinned through the lockfile and CI actions use commit SHA pins. Registry advisory lookup is unverified in this environment. Review covers the source and built artifacts, with live checks still required.

## Content review and date evidence

Reviewed the 70 Daily, 25 Party and five Tutorial records for competing choices, hint leakage, repeat premises, culture fit, language, length and provenance. The longest quote has 195 characters. The answer pool spans 71 distinct communities. All 142 choice names passed format validation, with targeted live spot checks for the names and cultures reviewed in detail. Seven cases received targeted edits. Examples include replacing a community whose comments are restricted to a single word, correcting the Los Angeles cycling community, adding a distinct repair-advice cue, and tightening Party clues around factory mechanics, sourdough and cooking. Question counts, IDs, rotation and scoring remain stable. Some broad distractors are deliberately plausible. External fairness and entertainment feedback are pending. The authored cases have no Reddit comment bodies, author IDs or source links. Spot checks included [r/BikeLA](https://www.reddit.com/r/BikeLA/) and [r/WhatsWrongWithYourCat](https://www.reddit.com/r/WhatsWrongWithYourCat/).

| December UTC | Fictional Daily case IDs |
| --- | --- |
| 8, 9, 10 | 056–060, 061–065, 066–070 |
| 11, 12, 13 | 001–005, 006–010, 011–015 |
| 14, 15, 16, 17 | 016–020, 021–025, 026–030, 031–035 |

The date-injected checks verified 50 unique cases across these ten days and the planned wrap. Separate tests verify that existing stored packs keep their question IDs and order through concurrent creation, retries and content-bank changes. The December 9 pack starts with cat behavior and a Los Angeles bike route, moves into vehicle diagnosis and ink on paper, then closes with hot composting. Its two easy, two medium and one hard cases cover five distinct communities. The local cycling detail and the car's “violin solo” give the reveal specific evidence to explain.

## Screenshot candidates

The Step 5 [after images](screenshots/step-5/after/) match the current client layout and share the same build size. The Step 6 local captures use the tested build and current cases. Pair them with an explicit local label if using them before live captures are available.

| Screen | Local candidate |
| --- | --- |
| Feed and mascot | [Feed preview](screenshots/step-6/local/preview.png) · [Main menu](screenshots/step-6/local/main-menu.png) |
| Daily Case | [Evidence Board](screenshots/step-6/local/daily-question.png) · [Answer reveal](screenshots/step-6/local/answer-reveal.png) |
| Party | [Votes and standings](screenshots/step-6/local/multiplayer-reveal.png) · [Final ranks](screenshots/step-6/local/multiplayer-results.png) |
| Daily Results | [Report with one finisher](screenshots/step-6/local/daily-results.png) · [Community Intelligence with five local fixtures](screenshots/step-6/local/community-intelligence-local-fixtures.png) |

## Live acceptance checks

- On the final Reddit installation, verify signed-out and ordinary-account access, inline and expanded views, same-day Daily pack and persisted completion, plus free access from the intended judge route.
- Use independent accounts to complete the same five-round Party. Check host start, deadlines, submission flags, distribution and final ranks. Reload one participant, then interrupt and restore its connection. Verify native Realtime before testing polling recovery.
- Check one real Reddit mobile app in both supported themes. Verify long names, touch targets, timer and scroll, plus share behavior. Observe one hosted UTC rollover or verify scheduler execution through its actual logs and the resulting pack. Confirm deletion handling without touching other users' progress.
- If three to five external testers are available, have each open the post without a rules briefing. Observe time and friction to the first guess. Ask about quote humor, clue fairness, clarity of wrong-answer explanations, Party versus solo, intent to return tomorrow and willingness to share.

## Judging simulation

These are internal QA scores out of five. The official criteria are equally weighted after the initial viability screening. [Official judging criteria](https://redditgameofday2026.devpost.com/rules)

| Criterion | Score | Verified evidence | Principal risk and pre-submission action | Still unverified |
| --- | --- | --- | --- | --- |
| Delightful UX | 4/5 | Original detective cat, readable Evidence Board, five-round Tutorial and animated feedback in the local browser | Test first-game clarity and clue fairness with new players | New-player reaction and native touch behavior |
| Polish | 3/5 | Responsive and reduced-motion checks, reproducible build, server-side scoring and paired Party standings | Validate the final post on a phone and finish end-to-end Reddit checks | Feed presentation, native WebView, hosted storage and realtime |
| Reddity | 3/5 | Community-specific writing, local voting and standings, opt-in contribution and curation controls | Test from ordinary Reddit accounts and collect organic rather than fixture results | Native engagement and any live approved source |
| Daily Content | 4/5 | 14 packs, 50 distinct cases across the submission and judging window, streak and UTC countdown | Observe a hosted rollover and keep the original post available | Scheduler behavior in Reddit and return intent |
