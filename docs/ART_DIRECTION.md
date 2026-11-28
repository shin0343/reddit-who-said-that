# Who Said That?

**Every comment leaves a clue.**

The game takes its visual cues from a friendly detective’s desk. A cat with a magnifying glass peeks out of an illustrated case folder. The desktop wordmark and feed preview share that original SVG artwork.

## Design system

Warm paper and plum ink lead in light mode. Dark mode uses charcoal, cream text and amber actions. Georgia sets the wordmark, quote and report titles. System sans-serif labels keep controls readable, and local monospace fonts identify case files, invite codes and timers. The same CSS tokens govern both themes. Buttons and disclosure controls have a 44 px minimum touch target, with a 3 px keyboard focus ring.

The Evidence Board leads with the comment, followed by four lettered suspects. Players can change their pick before **Lock In**. Highlighting, a check on the selected suspect, and explicit submitting and locked messages distinguish the states. Clues display their 30-point cost on a match. **CASE SOLVED!** and **WRONG LEAD!** use stamped text, with the intended community or actual Reddit source, the pick, explanation, points, and clues used. Interfaces respond in about 180 ms. The stamp and score count-up take roughly 270–320 ms while the next action stays available. Reduced motion removes these effects.

Community Detective uses original fictional cases inspired by internet community culture. Real Case Files uses permission-verified Reddit comments. The report uses a case-by-case outcome strip and a spoiler-free share. Party standings display the participants’ real choices and rank changes, with the top three marked in final results. Daily Community Intelligence unlocks at five ranked finishers in the day’s content mode.

## Browser verification

The baseline priority order was immediate submission without a confirmation step, weak quote and reveal hierarchy, generic game branding, then limited progress and state feedback on the menu and Party. The paired captures show the resulting changes at 390 px.

| Screen | Before | After |
| --- | --- | --- |
| Main Menu | [PNG](screenshots/step-5/before/main-menu.png) | [PNG](screenshots/step-5/after/main-menu.png) |
| Daily Question | [PNG](screenshots/step-5/before/daily-question.png) | [PNG](screenshots/step-5/after/daily-question.png) |
| Answer Reveal | [PNG](screenshots/step-5/before/answer-reveal.png) | [Solved](screenshots/step-5/after/answer-reveal.png), [Wrong lead](screenshots/step-5/after/wrong-lead.png) |
| Party Lobby | [PNG](screenshots/step-5/before/party-lobby.png) | [PNG](screenshots/step-5/after/party-lobby.png) |
| Multiplayer Round | [PNG](screenshots/step-5/before/multiplayer-round.png) | [PNG](screenshots/step-5/after/multiplayer-round.png) |
| Daily Results | [PNG](screenshots/step-5/before/daily-results.png) | [PNG](screenshots/step-5/after/daily-results.png) |

The [after folder](screenshots/step-5/after/) includes the feed preview, desktop dark theme, clue, Tutorial, multiplayer reveal and results, empty and populated leaderboard, contribution and curation, loading, error and manual share fallback. The long-text capture at 320 px uses a temporary browser-only layout fixture.

Chromium exercised the core screens at 320, 375, 390, 430, 768 and 1440 px in both schemes. Checks included horizontal overflow, touch targets, short-screen scrolling to Lock In, keyboard selection, focus, zoom availability, reduced motion, and contrast for text and feedback tokens. The demo completed all five Tutorial and Daily cases, tested clipboard and manual sharing, and completed five Party rounds as Alice and Bob with a mid-round reopen. Curation used the local moderator option and an empty approved bank. Unit coverage verifies the five-finisher threshold and content separation.

Combined production client JS and CSS grew from **271,235 B to 286,252 B** raw and **83,323 B to 88,270 B** gzip. Totals exclude source maps and HTML. Native Reddit WebView and Realtime remain **BLOCKED** because the Devvit CLI is signed out.
