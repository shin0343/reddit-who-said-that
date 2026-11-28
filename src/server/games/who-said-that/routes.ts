import type { DailyBrief } from '../../../shared/games/who-said-that/community.ts';
import { recordConsent } from '../../services/consent.ts';
import { withdrawContent } from '../../services/contentBank.ts';
import { parseCommentRef } from '../../providers/redditText.ts';
import { getOrCreateDaily, getPracticeDaily } from '../../services/daily.ts';
import { Hono } from 'hono';
import { context, reddit, redis } from '@devvit/web/server';
import {
  WST,
  type DailyAction,
  type WstDailyResponse,
  type WstMetaResponse,
} from '../../../shared/games/who-said-that/contracts.ts';
import { todayKey } from '../../services/dateKey.ts';
import { loadDaily } from '../../services/contentMaintenance.ts';
import {
  communityResults,
  dailyBoard,
  dailyHistory,
} from '../../services/leaderboard.ts';
import { toPublic } from './cases.ts';
import { curationRoutes } from './curationRoutes.ts';
import { isModerator, requireModerator } from '../../services/moderator.ts';
import { partyEnabled, partyRoutes } from './partyRoutes.ts';
import { playDaily, readDailyProgress } from '../../services/dailyPlay.ts';
import { erasePlayer, validAccountId } from '../../services/privacy.ts';
import { GameError } from '../../services/watched.ts';
import { isHint } from './round.ts';
import { SAMPLE_QUESTIONS } from './sampleQuestions.ts';

// Mounted at /api/wst. Server owns answers and scores; see docs/ARCHITECTURE.md.
export const wstRoutes = new Hono();
wstRoutes.route('/party', partyRoutes);
wstRoutes.route('/curation', curationRoutes);

wstRoutes.get('/meta', async (c) => {
  const username = (await reddit.getCurrentUsername()) ?? null;
  c.header('Cache-Control', 'no-store');
  const [party, canCurate] = await Promise.all([
    partyEnabled(),
    isModerator().catch(() => false),
  ]);
  return c.json<WstMetaResponse>({
    type: 'wst-meta',
    dateKey: todayKey(),
    modes: party ? ['daily', 'party'] : ['daily'],
    rounds: WST.roundsPerDaily,
    usesSampleContent: SAMPLE_QUESTIONS.every((q) => q.source === 'fictional'),
    username,
    canCurate,
  });
});

// Public catalog route retained for existing clients.
wstRoutes.get('/daily', async (c) => {
  c.header('Cache-Control', 'no-store');
  try {
    const daily = await loadDaily(todayKey());
    return c.json<WstDailyResponse>({
      type: 'wst-daily',
      dateKey: daily.dateKey,
      questions: daily.questions.flatMap((q) => (q ? [toPublic(q)] : [])),
      pack: daily.pack,
      usesSampleContent: daily.pack.mode !== 'official',
    });
  } catch (error) {
    if (error instanceof GameError)
      return c.json({ error: error.message }, error.status);
    console.error('[wst] /daily failed', error);
    return c.json({ error: "Could not load today's cases" }, 500);
  }
});

wstRoutes.get('/daily/brief', async (c) => {
  c.header('Cache-Control', 'no-store');
  const dateKey = todayKey();
  const {
    pack: { mode },
  } = await getOrCreateDaily(redis, dateKey);
  const uid = context.userId;
  if (!uid)
    return c.json<DailyBrief>({
      dateKey,
      mode,
      progress: 'new',
      round: 0,
      streak: 0,
    });
  const [play, records] = await Promise.all([
    readDailyProgress(redis, dateKey, uid),
    mode === 'practice' ? null : dailyHistory(redis, dateKey, uid, mode),
  ]);
  return c.json<DailyBrief>({
    dateKey,
    mode,
    ...play,
    streak: records?.streak.current ?? 0,
  });
});

wstRoutes.get('/daily/board', async (c) => {
  c.header('Cache-Control', 'no-store');
  return c.json(
    await dailyBoard(redis, await loadDaily(todayKey()), context.userId)
  );
});

function parseDailyAction(body: unknown): DailyAction {
  if (body && typeof body === 'object' && 'type' in body) {
    if (body.type === 'open') return { type: 'open' };
    if (
      'dateKey' in body &&
      typeof body.dateKey === 'string' &&
      'questionId' in body &&
      typeof body.questionId === 'string' &&
      body.questionId.length <= 64
    ) {
      const { dateKey, questionId } = body;
      if (body.type === 'next') return { type: 'next', dateKey, questionId };
      if (
        body.type === 'guess' &&
        'choice' in body &&
        typeof body.choice === 'string' &&
        body.choice.length <= 32
      ) {
        return { type: 'guess', dateKey, questionId, choice: body.choice };
      }
      if (body.type === 'hint' && 'kind' in body && isHint(body.kind)) {
        return { type: 'hint', dateKey, questionId, kind: body.kind };
      }
    }
  }
  throw new GameError('Invalid Daily action.', 400);
}

const dailyPlayRoutes = new Hono();
dailyPlayRoutes.post('/:mode{play|practice}', async (c) => {
  c.header('Cache-Control', 'no-store');
  try {
    if (!context.userId)
      throw new GameError('Sign in to Reddit to play the Daily Case.', 401);
    const action = parseDailyAction(await c.req.json().catch(() => null));
    const day = todayKey();
    const daily =
      c.req.param('mode') === 'practice'
        ? getPracticeDaily(day)
        : await loadDaily(day);
    const progress = await playDaily(redis, context.userId, daily, action);
    if (progress.finished)
      progress.community = await communityResults(redis, daily, context.userId);
    return c.json(progress);
  } catch (error) {
    if (error instanceof GameError)
      return c.json({ error: error.message }, error.status);
    console.error('[wst] /daily/play failed', error);
    return c.json({ error: 'Could not load your Daily Case.' }, 503);
  }
});

wstRoutes.route('/daily', dailyPlayRoutes);

wstRoutes.post('/me/delete', async (c) => {
  c.header('Cache-Control', 'no-store');
  try {
    if (!context.userId)
      throw new GameError('Sign in to Reddit to delete your game data.', 401);
    const input: unknown = await c.req.json().catch(() => null);
    let userId = context.userId;
    if (input && typeof input === 'object' && 'userId' in input) {
      await requireModerator();
      if (!validAccountId(input.userId))
        throw new GameError('Enter a valid Reddit user ID.', 400);
      userId = input.userId;
    }
    await erasePlayer(redis, userId, todayKey());
    return c.json({ deleted: true });
  } catch (error) {
    if (error instanceof GameError)
      return c.json({ error: error.message }, error.status);
    console.error('[wst] data deletion failed', error);
    return c.json({ error: 'Could not remove game data. Try again.' }, 503);
  }
});

wstRoutes.post('/contribute', async (c) => {
  c.header('Cache-Control', 'no-store');
  try {
    if (!context.userId)
      throw new GameError('Sign in to offer your own comment.', 401);
    const body: unknown = await c.req.json().catch(() => null);
    if (
      !body ||
      typeof body !== 'object' ||
      !('action' in body) ||
      (body.action !== 'offer' && body.action !== 'withdraw') ||
      !('comment' in body) ||
      typeof body.comment !== 'string' ||
      body.comment.length > 500
    ) {
      throw new GameError('Enter your Reddit comment ID or link.', 400);
    }
    if (
      body.action === 'offer' &&
      (!('confirmed' in body) || body.confirmed !== true)
    ) {
      throw new GameError(
        'Confirm permission before offering your comment.',
        400
      );
    }
    const id = parseCommentRef(body.comment);
    if (!id)
      throw new GameError('Enter a valid Reddit comment ID or link.', 400);
    const comment = await reddit.getCommentById(id).catch((error: unknown) => {
      if (error instanceof Error && /not found|404/i.test(error.message)) {
        throw new GameError(
          'Comment unavailable. A moderator can process a withdrawal request.',
          404
        );
      }
      throw error;
    });
    if (!comment || comment.authorId !== context.userId) {
      throw new GameError(
        'Only the original author can make this request.',
        403
      );
    }
    if (
      body.action === 'offer' &&
      (comment.removed ||
        comment.spam ||
        /^\[(deleted|removed)\]$/i.test(comment.body.trim()))
    ) {
      throw new GameError('Only available comments can be offered.', 400);
    }
    await recordConsent(
      redis,
      id,
      body.action === 'offer' ? 'active' : 'withdrawn'
    );
    if (body.action === 'withdraw')
      await withdrawContent(redis, id, 'Author withdrew permission');
    return c.json({
      state: body.action === 'offer' ? 'pending-review' : 'withdrawn',
    });
  } catch (error) {
    if (error instanceof GameError)
      return c.json({ error: error.message }, error.status);
    console.error('[wst] contribution request failed', error);
    return c.json(
      { error: 'Could not check comment ownership. Try again.' },
      503
    );
  }
});
