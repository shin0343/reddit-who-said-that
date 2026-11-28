# Known limitations

| Priority | Issue | Impact and disposition |
| --- | --- | --- |
| P0 | Devvit CLI is signed out, confirmed in Step 6.1 | No release upload, installation, live QA, or verified URLs. Authentication and a judge-accessible interactive post are submission gates. |
| P1 | Live platform behavior is unverified | Browser and service tests substituted Devvit identity, Redis, and transport. Verify native Scheduler, storage conflicts, permissions, Realtime, post access and Reddit WebView on the installed candidate. |
| P1 | Account deletion intake needs live confirmation | Players can erase their game data and moderators can process verified account requests. Devvit 0.15.4 provides no account-deletion trigger for this project. Confirm how the operator receives account-deletion notices for each installation and processes them. Daily records expire within 30 days and Party records within two hours. Confirm privacy and terms requirements with Devvit for stored Reddit IDs and short-lived Party usernames. |
| P2 | Community Intelligence starts quiet | The anonymous leaderboard can show ranked completions immediately. Choice distributions and percentile wait for five eligible finishers in the same installation and mode. |
| P2 | Party relies on a connected client for advancement | Server time closes the guessing window. A subsequent request progresses reveal or the next round. An explicit leave can close an active two-player room. Reloading or briefly losing the connection preserves the seat. |
| P2 | Finite content rotation | Daily repeats after 14 UTC days and Party after five fictional room sets. The judging window still has a distinct Daily pack for every UTC day. |
| Optional | Real Case Files has zero approved comments in the submission inventory | The authored mode is the submission experience. Live ownership, consent, approval, original deletion and withdrawal need a genuinely opted-in source. Legacy IDs are inert under the approval pipeline. |
| Optional | External testers and video publication remain pending | Local testers and automated browsers are QA fixtures. The storyboard contains the narration and shot plan. |

Account data deletion and original content deletion are distinct platform responsibilities. See the [Devvit Rules](https://developers.reddit.com/docs/devvit_rules#enable-and-respect-user-deletions).
