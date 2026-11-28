# Step 6 release checklist

**NOT READY.** The public demo link and installed version are verified. The owner completed a live Daily. Ordinary signed-in gameplay remains the release gate. Two-account Party, Realtime, and device coverage are additional QA.

## Readiness gate

| Gate | Status | Scope |
| --- | --- | --- |
| Local Build | PASS | Production Vite build and pinned Devvit configuration and entrypoints |
| Unit Tests | PASS | 36/36, including the original 34 |
| Content Validation | PASS | 100 cases reviewed, 4/4 automated content and bundle checks |
| Security Review | BLOCKED | Upload bundles exclude localhost identity and transport. Moderator curation and deletion UI verified. Ordinary account permissions and deletion execution remain open |
| Real Reddit Daily | PASS | Owner completed and resumed the five-round fictional Daily. Non-moderator play remains unverified |
| Real Reddit Multiplayer | BLOCKED | Room creation and the host lobby passed. A second signed-in session is needed for a match |
| Native Realtime | BLOCKED | The host lobby reported Live. Cross-account events and polling recovery are unverified |
| Mobile Reddit WebView | NOT TESTED | Version 0.0.1 verified in desktop Reddit. A physical device is still needed |
| App Listing URL | PASS | [Listing returned by Devvit](https://developers.reddit.com/apps/who-said-that-jh-hi) |
| Accessible Demo Post | PASS | Public community with two members. The same post opens signed out. Ordinary signed-in gameplay is tracked separately. Devvit Admin Helper remains installed |
| Daily Content Availability | PASS | Fictional schedule verified locally through judging. Hosted Scheduler verification is pending |
| README | PASS | Root English README covers play, configuration and deployment |
| English Project Description | PASS | [Devpost copy](DEVPOST_SUBMISSION.md) |
| Content Compliance | PASS | Fictional submission inventory and provenance reviewed. Live consent and broader platform privacy checks remain open |
| Demo Video | NOT TESTED | Optional. English storyboard and narration drafted. Video and public URL pending |
| External Playtest | NOT TESTED | Optional QA with three to five non-developers. No participants recruited |

## Official timing and access

Submission closes **December 8, 2026 at 18:00 PST**. Judging runs **December 9 at 00:00 to December 16 at 18:00 PST**. Section 4 requires a Devvit game in an Interactive Post, an app listing, the test subreddit and demo post links, a detailed root README, and English submission materials or English translations. Keep access free and unrestricted for the judges through the end of judging. A public test subreddit with fewer than 200 members is the preferred route. Section 4 also permits a subreddit configured with `devvit-dev-bot` to admit Reddit admins. The hackathon directs entrants to upload and playtest. Broad publication and App Review can wait. The optional video should be under a minute and public on a supported host if submitted. Current signed-in Devpost form fields are **UNVERIFIED**. [Official rules](https://redditgameofday2026.devpost.com/rules) · [Hackathon overview](https://redditgameofday2026.devpost.com/) · [Devvit Playtest](https://developers.reddit.com/docs/guides/tools/playtest)

## Recorded candidate

| Record | Value |
| --- | --- |
| Candidate Git commit | `804a1c14303eb0410dcca2d37008d51b4873e7b8` on `main` and `origin/main` |
| Candidate source | Devvit updated the app slug, package name and default test target on first upload. Gameplay source was unchanged and the server fingerprint matched |
| Local build fingerprint | SHA-256 of `dist/server/index.cjs` is `c94db689f990a930a626f9936a6eb1eb7da057569c4bfe4d06cbe0339bf39c0e` |
| Devvit CLI / Web / Start | 0.15.4 / 0.15.4 / 0.15.4 |
| Registered app | `who-said-that-jh-hi`, registered in the authenticated developer account |
| Upload and install | **0.0.1**. Devvit listed the installed version and Devvit Admin Helper App **0.0.6** |
| URLs | [App Listing](https://developers.reddit.com/apps/who-said-that-jh-hi) · [Public test subreddit](https://www.reddit.com/r/who_said_that_jh__dev/) · [Interactive Post](https://www.reddit.com/r/who_said_that_jh__dev/comments/1y78hfj/who_said_that_todays_case/) |
| Authentication | CLI login and developer account onboarding completed |

## Reddit rollout

1. From this repo with Node 24, the owner runs `npx devvit login` in their terminal and completes the browser authentication. Verify `npx devvit whoami`, name ownership, uploaded versions, and whether a suitable test subreddit already exists. Keep the account tied to the intended app.
2. Use a private test installation for preflight, and let old Party rooms expire before upgrading an installation with active players. Obtain the owner's approval before creating or changing a public subreddit, installing an app that posts publicly on install, or publishing a demo post. Confirm moderator access and fewer than 200 members. Confirm `partyEnabled` is on.
3. Run the final build and post-build checks from a known source snapshot. Upload with `npx devvit upload` and record the real listing URL and uploaded version. Use `npm run dev -- <approved-test-subreddit>` for live QA. The playtest watcher deploys on saves. Record the installation and post created by the install trigger, or create a post from **Create Who Said That? post** if needed. Use the actual permalink.
4. Verify the feed preview and expanded game on Reddit. Complete Daily and Party as two normal accounts in independent sessions. Compare final standings, check reconnect and native Realtime, and verify one physical iOS or Android Reddit client. Confirm the judge access route from a non-moderator account. Run the [live acceptance checks](TEST_REPORT.md).
5. Stop the playtest watcher. Explicitly install the verified upload using `npx devvit install <approved-test-subreddit> @<uploaded-version>` and repeat the access, Daily and Party smoke checks on that installation. Record the actual installed version against the clean source commit or exact source snapshot and capture the listing, subreddit and post links. Use those links in the Devpost draft.
6. Submit on Devpost only after owner review and approval. Keep the same post and verified app version installed and accessible through December 16 at 18:00 PST. Monitor access and rollover without resetting Redis. Freeze the submission and its running candidate by the deadline. Seek organizer approval for any post-deadline change to the submitted material.

## Daily operations

The rotation epoch is November 27 UTC. The owner-authorized public opening was November 27 PST. Gameplay was verified in the November 28 UTC pack. The installation went live after the UTC rollover. The next scheduled midnight rollover still needs confirmation. December 8–17 UTC covers ten distinct five-case packs, including every judging day and the PST-to-UTC spillover on December 17. December 9 UTC uses cases 061–065. The existing rotation wraps December 11 UTC to pack 001–005. Players who saw that pack on November 27 UTC will see it again. The same formula applies to every player and environment. The Scheduler handles rollover, and the first request can also create the new day's pack. Keep deployed cases and existing Redis progress stable during judging. [Date and content evidence](TEST_REPORT.md)
