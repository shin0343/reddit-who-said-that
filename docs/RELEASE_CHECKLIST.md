# Step 6 release checklist

**NOT READY.** The Step 6 candidate passed local verification. The official entry requires a working Reddit Interactive Post and verified listing, test subreddit, and demo links.

## Readiness gate

| Gate | Status | Scope |
| --- | --- | --- |
| Local Build | PASS | Production Vite build and pinned Devvit configuration and entrypoints |
| Unit Tests | PASS | 36/36, including the original 34 |
| Content Validation | PASS | 100 cases reviewed, 4/4 automated content and bundle checks |
| Security Review | BLOCKED | Local review and targeted fixes complete. Native authorization, Redis behavior, and deletion intake remain open |
| Real Reddit Daily | BLOCKED | CLI authentication |
| Real Reddit Multiplayer | BLOCKED | CLI authentication and a second signed-in account |
| Native Realtime | BLOCKED | Requires a Reddit installation |
| Mobile Reddit WebView | BLOCKED | Requires the installed post and a real device |
| App Listing URL | BLOCKED | Upload and ownership checks pending |
| Accessible Demo Post | BLOCKED | Installation, approved access route and second-account check pending |
| Daily Content Availability | PASS | Fictional schedule verified locally through judging. Hosted Scheduler verification is pending |
| README | PASS | Root English README covers play, configuration and deployment. Live links are pending |
| English Project Description | PASS | [Devpost copy](DEVPOST_SUBMISSION.md) |
| Content Compliance | PASS | Fictional submission inventory and provenance reviewed. Live consent and broader platform privacy checks remain open |
| Demo Video | NOT TESTED | Optional. English storyboard and narration drafted. Video and public URL pending |
| External Playtest | NOT TESTED | Optional QA with three to five non-developers. No participants recruited |

## Official timing and access

Submission closes **December 8, 2026 at 18:00 PST**. Judging runs **December 9 at 00:00 to December 16 at 18:00 PST**. Section 4 requires a Devvit game in an Interactive Post, an app listing, the test subreddit and demo post links, a detailed root README, and English submission materials or English translations. Keep access free and unrestricted for the judges through the end of judging. A public test subreddit with fewer than 200 members is the preferred route. Section 4 also permits a subreddit configured with `devvit-dev-bot` to admit Reddit admins. The hackathon directs entrants to upload and playtest. Broad publication and App Review can wait. The optional video should be under a minute and public on a supported host if submitted. Current signed-in Devpost form fields are **UNVERIFIED**. [Official rules](https://redditgameofday2026.devpost.com/rules) · [Hackathon overview](https://redditgameofday2026.devpost.com/) · [Devvit Playtest](https://developers.reddit.com/docs/guides/tools/playtest)

## Recorded candidate

| Record | Value |
| --- | --- |
| Base Git commit | `455ca88479a68f3e1694094a7bed23836d8da1d4` on `main` |
| Candidate source | Steps 2–6 candidate recorded on `main`. At upload, record the exact Git SHA and deployed version together |
| Local build fingerprint | SHA-256 of `dist/server/index.cjs` is `c94db689f990a930a626f9936a6eb1eb7da057569c4bfe4d06cbe0339bf39c0e` |
| Devvit CLI / Web / Start | 0.15.4 / 0.15.4 / 0.15.4 |
| Configured app name | `who-said-that`. Availability, ownership and existing upload history are **UNVERIFIED** |
| Package version | `0.0.0`. Devvit upload and installation version pending |
| App Listing / Subreddit / Demo Post | Pending authenticated verification |
| Step 6.1 authentication | `npx devvit whoami` returned `Not currently logged in`. Owner browser authentication is required |

## Reddit rollout

1. From this repo with Node 24, the owner runs `npx devvit login` in their terminal and completes the browser authentication. Verify `npx devvit whoami`, name ownership, uploaded versions, and whether a suitable test subreddit already exists. Keep the account tied to the intended app.
2. Use a private test installation for preflight, and let old Party rooms expire before upgrading an installation with active players. Obtain the owner's approval before creating or changing a public subreddit, installing an app that posts publicly on install, or publishing a demo post. Confirm moderator access and fewer than 200 members. Confirm `partyEnabled` is on.
3. Run the final build and post-build checks from a known source snapshot. Upload with `npx devvit upload` and record the real listing URL and uploaded version. Use `npm run dev -- <approved-test-subreddit>` for live QA. The playtest watcher deploys on saves. Record the installation and post created by the install trigger, or create a post from **Create Who Said That? post** if needed. Use the actual permalink.
4. Verify the feed preview and expanded game on Reddit. Complete Daily and Party as two normal accounts in independent sessions. Compare final standings, check reconnect and native Realtime, and verify one physical iOS or Android Reddit client. Confirm the judge access route from a non-moderator account. Run the [live acceptance checks](TEST_REPORT.md).
5. Stop the playtest watcher. Explicitly install the verified upload using `npx devvit install <approved-test-subreddit> @<uploaded-version>` and repeat the access, Daily and Party smoke checks on that installation. Record the actual installed version against the clean source commit or exact source snapshot and capture the listing, subreddit and post links. Use those links in the Devpost draft.
6. Submit on Devpost only after owner review and approval. Keep the same post and verified app version installed and accessible through December 16 at 18:00 PST. Monitor access and rollover without resetting Redis. Freeze the submission and its running candidate by the deadline. Seek organizer approval for any post-deadline change to the submitted material.

## Daily operations

The rotation epoch is November 27 UTC. A public opening on December 8 PST is the proposed submission route, with private QA beforehand. The actual opening date is pending. December 8–17 UTC covers ten distinct five-case packs, including every judging day and the PST-to-UTC spillover on December 17. December 9 UTC uses cases 061–065. The existing rotation wraps December 11 UTC to pack 001–005. Players who saw that pack on November 27 UTC will see it again. The same formula applies to every player and environment. The Scheduler handles rollover, and the first request can also create the new day's pack. Keep deployed cases and existing Redis progress stable during judging. [Date and content evidence](TEST_REPORT.md)
