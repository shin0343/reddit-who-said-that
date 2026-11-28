# Final release checklist

**Submission readiness: NOT READY.** The public post and the deployed candidate are confirmed. The project’s existing release gate requires an ordinary Reddit account to open the game, finish the Fictional Daily, and reopen the result. Two leaderboard entries are visible, and the second entry is anonymous.

## Official submission requirements

| Requirement | Evidence |
| --- | --- |
| Working Devvit game in an Interactive Post and free access for judges through the end of judging | The public post and expanded game menu open signed out. Daily and Party require a Reddit sign-in. The owner’s completed Daily reopens. Ordinary signed-in access is still open in this project’s QA. |
| App listing, test subreddit and demo post links | The listing URL returned HTTP 200 and Devvit confirmed the registered app and installed version. Both Reddit URLs opened signed out. The community was previously recorded at two members. |
| Detailed root README and English submission materials | [README](../README.md) and [Devpost copy](DEVPOST_SUBMISSION.md) reviewed. The owner completes the required fields in the signed-in form. |
| Rights to submitted content and Devvit Rules | The Fictional submission uses the project’s authored cases. The moderator screen shows zero approved Reddit comments. Open platform privacy checks are recorded in [Known limitations](KNOWN_LIMITATIONS.md). |

The public test subreddit meets the access route described in §4. The Devvit Admin Helper is also installed. The event asks entrants to upload and playtest and advises deferring App Review and broad publication. A demo video, public repository link and feedback survey are optional. [Official rules](https://redditgameofday2026.devpost.com/rules) · [Hackathon overview](https://redditgameofday2026.devpost.com/)

## Project QA

| Check | Status |
| --- | --- |
| Owner Daily and stored result | **PASS.** The owner’s finished report reopened at 510 points with four cases solved. |
| Non-moderator entry, five Daily rounds and reopened result | **UNVERIFIED.** Existing project release gate. The owner confirmed a second account is unavailable for testing. |
| Two-account Party through five rounds and matching final standings | **UNVERIFIED.** Host lobby and prior local two-player tests are recorded. |
| Native Realtime events, browser refresh recovery, and polling fallback | **UNVERIFIED.** Tracked individually in the [test report](TEST_REPORT.md). |
| Physical iOS or Android Reddit app | **NOT TESTED.** No device result was supplied. |
| Hosted UTC transition and Scheduler execution | **UNVERIFIED.** A current pack and countdown were visible. The hosted log stream provided no execution evidence. |

Party, Realtime, recovery, mobile and Scheduler checks are project QA. The Fictional submission can use its authored inventory with zero approved Reddit comments. The previously validated rotation provides distinct five-case packs for December 8–17 UTC, covering the judging window.

## Locked candidate

| Item | Value |
| --- | --- |
| Devvit game and Admin Helper | `who-said-that-jh-hi` **0.0.1** and Devvit Admin Helper **0.0.6**, confirmed by the installed-app query |
| Gameplay source and previous documentation | `804a1c14303eb0410dcca2d37008d51b4873e7b8` and `e2523f1` respectively. The release metadata records the registered app slug and test subreddit. |
| Saved server bundle SHA-256 | `c94db689f990a930a626f9936a6eb1eb7da057569c4bfe4d06cbe0339bf39c0e` |
| Submission links | [App listing](https://developers.reddit.com/apps/who-said-that-jh-hi) · [Public test subreddit](https://www.reddit.com/r/who_said_that_jh__dev/) · [Interactive Post](https://www.reddit.com/r/who_said_that_jh__dev/comments/1y78hfj/who_said_that_todays_case/) |

## Owner submission

1. Have a tester with an existing non-moderator Reddit account complete the five Daily rounds and reopen the result on the existing post. Record the evidence to clear the release gate.
2. In Devpost, join the event and open **Enter a Submission**. Use the English description and judge instructions in [Devpost copy](DEVPOST_SUBMISSION.md), enter the three URLs above, and complete the remaining required form fields.
3. Submit by **December 8, 2026 at 18:00 PST**. Keep the demo free and accessible on the submitted installation through **December 16, 2026 at 18:00 PST**. [Official rules](https://redditgameofday2026.devpost.com/rules)
