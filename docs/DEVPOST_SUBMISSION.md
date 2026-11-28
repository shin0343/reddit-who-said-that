# Who Said That?

**Tagline:** Every comment leaves a clue.

**Category:** Best Daily Game

| Devpost field | Value |
| --- | --- |
| App Listing URL | [Who Said That? on Devvit](https://developers.reddit.com/apps/who-said-that-jh-hi) |
| Test Subreddit URL | [Public test subreddit](https://www.reddit.com/r/who_said_that_jh__dev/). Devvit Admin Helper is installed |
| Demo Post URL | [Interactive Post](https://www.reddit.com/r/who_said_that_jh__dev/comments/1y78hfj/who_said_that_todays_case/). Public post access and owner Daily play verified. Ordinary signed-in gameplay remains unverified |
| Demo video (optional) | [55-second recording plan](VIDEO_STORYBOARD.md) |

## Inspiration

A community leaves fingerprints on its comments. A missing bike lane, a sourdough starter that runs on its own schedule, or a cat that treats the toaster as a full-time job can tell you where a conversation belongs. We wanted to turn that instinct into a short daily game that people could discuss together.

## What it does

Who Said That? turns internet community culture into a daily social deduction game rooted in Reddit community culture. Open the Interactive Post, meet our original detective cat, and read a comment on the Evidence Board. Pick one of four communities, take a clue if you need it, and lock in your theory. The reveal explains what gave the community away.

**Community Detective** opens a five-case Daily at midnight UTC. Each installation plays the same Daily pack on a given date in this fictional mode. Finish to see your score, earn a streak, compare your results on the subreddit leaderboard, and copy a spoiler-free report for the post's comments. With at least five ranked finishers, **Community Intelligence** shows choice distributions and the cases that stumped the most detectives. You can learn the rules in a separate, unranked five-case Tutorial.

**Multiplayer Party** is designed for two to six people in real time. Join by room code and play five timed rounds. After each round, the Evidence Board reveals the community guess distribution and updated standings. The live host lobby has been verified. A two-account Reddit match is pending.

The game includes 100 original fictional cases inspired by community culture, with 70 for Daily, 25 for Party, and five for Tutorial. The app also implements an opt-in form for Reddit authors to offer or withdraw their comments. Moderators review permissions and choose a content pool. At preparation time, the approved Reddit-comment pool contains zero cases. The submission targets the fully playable fictional mode.

## How we built it

We built the feed preview and expanded game with Devvit Web and React. The Devvit server controls the case packs, allowed actions, deadlines, and scoring. Per-subreddit Redis stores progress and standings. The Scheduler supports the UTC rollover, and the Party client uses Realtime notifications with polling recovery. Version 0.0.1 is installed and playable on Reddit. The owner completed a live Daily and opened a Party lobby. The [release checklist](RELEASE_CHECKLIST.md) tracks independent access and two-player verification.

## Challenges we ran into

A plausible joke can fit several communities. We tuned the four options, clues, and reveal explanations around the details that make one community the best fit. We also had to keep a resumed Daily stable while ensuring withdrawn source material could be removed, and make sure simultaneous Party submissions settle to one result for everyone.

## Accomplishments that we're proud of

The original detective cat gives the feed preview a face, and the Evidence Board turns a guess into a little reveal. The same five-case loop supports solo play and live discussion, while keeping each player's guess private until the Party round closes. The fictional game already has 14 daily packs before the rotation repeats.

## What we learned

A good reveal makes the player see the comment differently. The explanation can make a wrong guess as satisfying as a right one when it points to a detail the player missed. We also learned to keep rankings quiet until enough people have played to make the comparison meaningful.

## What's next

We want to test the permission and moderation workflow with consenting authors and expand the rotating case library. Reddit Courtroom and small 3D minigames are ideas for future experiments.

## Judge instructions

Open the supplied demo post in Reddit and expand the game. Start **Daily Case** or use **Tutorial** to learn the loop. For Party, have two signed-in accounts open the same post. One player creates a room, the other joins by code and readies up, and the host starts. Daily and Party are free.
