# Known limitations

| Priority | Issue | Impact and disposition |
| --- | --- | --- |
| P0 | Ordinary signed-in play is unverified | The public post opens in an independent signed-out session and the owner can play 0.0.1. Verify the game from a signed-in non-moderator account before submission. |
| P1 | Live platform coverage is partial | The owner completed Daily and created a Party Room. Two-account Realtime, polling recovery, and the next UTC Scheduler rollover remain unverified. Physical Reddit mobile app coverage is optional and remains not tested. |
| P1 | Account deletion intake needs live confirmation | The live deletion confirmation is available. Execution and the moderator workflow for verified account requests still need a designated test account. Devvit 0.15.4 provides no account-deletion trigger for this project. Confirm how the operator receives account-deletion notices for each installation and processes them. Daily records expire within 30 days and Party records within two hours. Confirm privacy and terms requirements with Devvit for stored Reddit IDs and short-lived Party usernames. |
| P2 | Community Intelligence starts quiet | The anonymous leaderboard can show ranked completions immediately. Choice distributions and percentile wait for five eligible finishers in the same installation and mode. |
| P2 | Party relies on a connected client for advancement | Server time closes the guessing window. A subsequent request progresses reveal or the next round. An explicit leave can close an active two-player room. Reloading or briefly losing the connection preserves the seat. |
| P2 | Finite content rotation | Daily repeats after 14 UTC days and Party after five fictional room sets. The judging window still has a distinct Daily pack for every UTC day. |
| Optional | Real Case Files has zero approved comments in the submission inventory | The authored mode is the submission experience. Live ownership, consent, approval, original deletion and withdrawal need a genuinely opted-in source. Legacy IDs are inert under the approval pipeline. |
| Optional | External testers and video publication remain pending | Local testers and automated browsers are QA fixtures. The storyboard contains the narration and shot plan. |

Account data deletion and original content deletion are distinct platform responsibilities. See the [Devvit Rules](https://developers.reddit.com/docs/devvit_rules#enable-and-respect-user-deletions).
