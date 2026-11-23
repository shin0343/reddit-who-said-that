import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import { WST, type WstDailyResponse, type WstMetaResponse } from '../../../shared/games/who-said-that/contracts.ts';
import { todayKey } from '../../services/dateKey.ts';
import { getOrCreateDaily } from '../../services/daily.ts';
import { toPublic } from './cases.ts';
import { SAMPLE_QUESTIONS } from './sampleQuestions.ts';

// Mounted at /api/wst. Server owns answers and scores; see docs/ARCHITECTURE.md.
export const wstRoutes = new Hono();

wstRoutes.get('/meta', async (c) => {
  const username = (await reddit.getCurrentUsername()) ?? null;
  return c.json<WstMetaResponse>({
    type: 'wst-meta',
    dateKey: todayKey(),
    modes: ['daily'],
    rounds: WST.roundsPerDaily,
    usesSampleContent: SAMPLE_QUESTIONS.every((q) => q.source === 'fictional'),
    username,
  });
});

// Today's cases WITHOUT answers. Player progress is added in Phase 2.
wstRoutes.get('/daily', async (c) => {
  try {
    const daily = await getOrCreateDaily(todayKey());
    return c.json<WstDailyResponse>({
      type: 'wst-daily',
      dateKey: daily.dateKey,
      questions: daily.questions.map(toPublic),
      usesSampleContent: daily.questions.some((q) => q.source === 'fictional'),
    });
  } catch (error) {
    console.error('[wst] /daily failed', error);
    return c.json({ error: 'Could not load today\'s cases' }, 500);
  }
});

// TODO(Phase 2): GET  /daily       -> add player progress (round, results) to the response
// TODO(Phase 2): POST /daily/guess -> GuessRequest => RoundResult (scoreRound, persist, distribution)
// TODO(Phase 2): POST /daily/hint  -> reveal a hint server-side and record its cost
// TODO(Phase 3): /party/*           -> room create/join/ready/start/guess (see GAME_DESIGN.md)
