# Who Said That?

**Every comment leaves a clue.**

Read an anonymous comment, pick one of four communities, then press **Lock In**. Play five cases in the Daily or bring two to six players into a live Party Room.

Built with Devvit Web for Reddit's Game of the Day Hackathon 2026.

**Community Detective** serves original fictional cases inspired by internet community culture. The 100 cases include 70 Daily, 25 Party, and five unranked Tutorial cases. **Real Case Files** uses permission-verified Reddit comments when the relevant pool has enough approved cases. Daily rankings, voting statistics, streaks, and personal bests are tracked per content mode. The Daily refreshes at 00:00 UTC in the same interactive post.

## How to play

- **Daily Case.** Open the game from the Reddit feed. Read the Evidence Board, select one of four communities and press **Lock In**. Each optional clue costs 30 points on a correct answer. Finish five cases to record one ranked result for that day. Come back after midnight UTC for the next pack.
- **Tutorial.** Learn the same loop in five unranked cases before starting the Daily.
- **Multiplayer Party.** Two to six signed-in players open the same post. The host creates a room and shares the code. Everyone else joins and readies up, then the host starts. Players have 20 seconds per round. The game reveals the votes and points after each round and the final standings after five.
- **Results.** The report shows your score, streak and subreddit leaderboard. After five ranked finishers in the same content mode, Community Intelligence shows aggregate choices and the hardest cases to eligible finishers. **Share results** copies a spoiler-free report you can paste into a comment.

Devvit upload and the judge links are pending authentication. See the [release checklist](docs/RELEASE_CHECKLIST.md) for the candidate status.

## Develop

```bash
npm install
npm run test:types && npm run lint && npm run test:unit && npm run build
npx devvit login     # once
npx devvit upload    # first upload for your personal test app
npm run dev -- r/your_test_subreddit  # replace with your test subreddit
```

Use the intended app name in `devvit.json`, and confirm it belongs to your account before you upload. Use a test subreddit with fewer than 200 members. The app creates an Interactive Post on install. Moderators can also use **Create Who Said That? post** from the subreddit menu. For the multiplayer playtest, sign in with two Reddit accounts in separate browser profiles or devices, open the same Devvit test post, and share the room code. Ready up, finish five rounds, and reload one session mid-game to verify recovery. Set **Enable Multiplayer Party** to off in the app’s subreddit settings to disable Party.

## Local demo

```sh
npm install
npm run demo
```

With Node 24, open [Alice](http://127.0.0.1:4173/?player=alice) and [Bob](http://127.0.0.1:4173/?player=bob) in separate tabs. Try **Start Daily Case**, or create a **Multiplayer Party** room in one tab and join it by code in the other. This localhost demo uses the game server and browser build with mocked Devvit identity and realtime. Progress resets when the process exits. Rankings start empty and grow as demo players finish. Run `npm run validate:content` after `npm run build` to also check the browser bundles for spoilers.

For the empty moderator curation screen, run `WST_DEMO_MODERATOR=alice npm run demo` and open Alice. The demo has zero approved Reddit comments.

Community Detective provides 14 UTC Daily packs before cycling. Party rotates five disjoint sets before cycling. The three authored datasets are under `src/server/content/fictional/`. Add complete five-case groups with new IDs and keep issued records stable.

## Content and privacy

The ten bundled Reddit IDs are candidates with permission and current availability unverified. Comment authors can opt in or withdraw under **Contribute a comment**. Devvit checks that the signed-in account owns the comment. The author can share its ID with a moderator for review. For permission obtained outside the app, keep the author's explicit grant privately and use a non-identifying receipt ID in **Content curation**. Then choose Daily or Party, validate the preview, and approve. To process an offline revocation, withdraw the case in curation. Authors who can still access their comments can revoke permission themselves. This app sends no invitations or messages.

The app uses the signed-in Reddit account ID to resume progress, prevent duplicate ranked results and manage Party membership. The Daily leaderboard shows anonymous positions. Party usernames and scores are shown only to room members. Player records stay in the app's subreddit-scoped Redis. Daily records expire within 30 days and Party rooms within two hours. Players can remove their game records under **Game data**. Moderators can apply verified account deletion requests from **Content curation**. Use **Contribute a comment** or ask the installation moderators to withdraw a source comment.

Contributors and coding agents: start with [`docs/AGENT_HANDOFF.md`](docs/AGENT_HANDOFF.md).

| Doc | What's in it |
|---|---|
| [Art direction and browser captures](docs/ART_DIRECTION.md) | Design system, game feel, Step 5 verification |
| [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) | Rules, scoring, MVP scope, design principles |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Modules, Redis keys, realtime flow, adding a game |
| [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md) | Phases 1–6 with done criteria |
| [`docs/HACKATHON_REQUIREMENTS.md`](docs/HACKATHON_REQUIREMENTS.md) | Rules, judging, Devvit limits, content policy |

License: BSD-3-Clause (from the Devvit template).
