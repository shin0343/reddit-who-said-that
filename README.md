# Who Said That?

A daily Reddit game: read one anonymous comment, guess which of four subreddits wrote it. Five cases a day, a reveal that explains the community's in-joke, and a leaderboard for your subreddit.

Built with Devvit Web for Reddit's Game of the Day Hackathon 2026.

> Status: early scaffold. Gameplay lands in upcoming phases. Sample cases are fictional and labeled in-app.

## Develop

```bash
npm install
npm run test:types && npm run lint && npm run test:unit && npm run build
npx devvit login     # once
npm run dev          # playtest on your test subreddit
```

Contributors and coding agents: start with [`docs/AGENT_HANDOFF.md`](docs/AGENT_HANDOFF.md).

| Doc | What's in it |
|---|---|
| [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) | Rules, scoring, MVP scope, design principles |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Modules, Redis keys, realtime flow, adding a game |
| [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md) | Phases 1–6 with done criteria |
| [`docs/HACKATHON_REQUIREMENTS.md`](docs/HACKATHON_REQUIREMENTS.md) | Rules, judging, Devvit limits, content policy |

License: BSD-3-Clause (from the Devvit template).
