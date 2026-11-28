import { createHash, randomUUID } from 'node:crypto';
import { redis } from '@devvit/web/server';
import type { ContentPermission } from '../../../shared/games/who-said-that/community.ts';
import { readConsent } from '../../services/consent.ts';
import { Hono } from 'hono';
import { loadCase } from '../../providers/questions.ts';
import {
  parseCommentRef,
  sanitizeCommentBody,
} from '../../providers/redditText.ts';
import {
  approveContent,
  contentStatus,
  withdrawContent,
} from '../../services/contentBank.ts';
import { requireModerator } from '../../services/moderator.ts';
import { GameError } from '../../services/watched.ts';

export const curationRoutes = new Hono();
curationRoutes.onError((error, c) => {
  if (error instanceof GameError)
    return c.json({ error: error.message }, error.status);
  console.error('[curation] request failed', error);
  return c.json({ error: 'Content curation is temporarily unavailable.' }, 503);
});
curationRoutes.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await requireModerator();
  await next();
});
curationRoutes.get('/', async (c) => c.json(await contentStatus(redis)));

curationRoutes.post('/', async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  if (
    !body ||
    typeof body !== 'object' ||
    !('type' in body) ||
    !('comment' in body) ||
    typeof body.comment !== 'string' ||
    body.comment.length > 500
  )
    throw new GameError('Enter a Reddit comment ID or link.', 400);
  const commentId = parseCommentRef(body.comment);
  if (!commentId)
    throw new GameError('Enter a valid Reddit comment ID or link.', 400);
  if (body.type === 'withdraw') {
    const changed = await withdrawContent(
      redis,
      commentId,
      'Withdrawn by moderator'
    );
    if (!changed)
      throw new GameError('No approved case found for this comment.', 404);
    return c.json(await contentStatus(redis));
  }
  if (body.type !== 'review' && body.type !== 'approve')
    throw new GameError('Invalid curation action.', 400);
  const consent = await readConsent(redis, commentId);
  if (consent?.state === 'withdrawn')
    throw new GameError('The author withdrew permission.');
  let permission: ContentPermission;
  if (consent?.state === 'active') {
    permission = { kind: 'author-opt-in', at: consent.at };
  } else {
    if (
      !('permissionConfirmed' in body) ||
      body.permissionConfirmed !== true ||
      !('consentReference' in body) ||
      typeof body.consentReference !== 'string' ||
      !/^[a-z0-9_-]{6,48}$/i.test(body.consentReference.trim())
    ) {
      throw new GameError(
        'Record the author’s permission using an internal receipt ID, or ask the author to opt in.',
        400
      );
    }
    permission = {
      kind: 'documented',
      at: Date.now(),
      reference: body.consentReference.trim(),
    };
  }
  if (
    !('pool' in body) ||
    (body.pool !== 'daily' && body.pool !== 'party') ||
    !('difficulty' in body) ||
    (body.difficulty !== 'easy' &&
      body.difficulty !== 'medium' &&
      body.difficulty !== 'hard')
  ) {
    throw new GameError('Choose a pool and difficulty.', 400);
  }
  if (
    !('distractors' in body) ||
    typeof body.distractors !== 'string' ||
    body.distractors.length > 100 ||
    !('explanation' in body) ||
    typeof body.explanation !== 'string' ||
    body.explanation.length > 240
  ) {
    throw new GameError(
      'Enter three subreddit choices and a brief explanation.',
      400
    );
  }
  const distractors = body.distractors
    .split(',')
    .map((value) => value.trim().replace(/^r\//i, ''));
  const explanation = sanitizeCommentBody(body.explanation);
  if (
    distractors.length !== 3 ||
    distractors.some((name) => !/^[a-z0-9_]{2,21}$/i.test(name)) ||
    explanation.length < 10
  ) {
    throw new GameError(
      'Enter three subreddit names and a short culture explanation.',
      400
    );
  }
  const id = `reddit-${randomUUID()}`;
  const result = await loadCase({ id, commentId, distractors, explanation });
  if (!result.ok)
    throw new GameError(result.reason, result.temporary ? 503 : 400);
  const { record } = result;
  const review = createHash('sha256')
    .update(
      JSON.stringify([
        commentId,
        result.postId,
        body.pool,
        body.difficulty,
        distractors,
        record.body,
        record.threadTitle,
        record.answerSubreddit,
        record.explanation,
        permission.kind === 'documented' ? permission.reference : permission.at,
      ])
    )
    .digest('hex');
  if (body.type === 'review')
    return c.json({
      body: record.body,
      answer: record.answerSubreddit,
      review,
    });
  if (!('review' in body) || body.review !== review) {
    throw new GameError('The case changed. Validate and preview it again.');
  }
  const now = Date.now();
  await approveContent(
    redis,
    {
      id,
      commentId,
      postId: result.postId,
      pool: body.pool,
      difficulty: body.difficulty,
      status: 'approved',
      checkedAt: now,
      permission,
    },
    result.record,
    now
  );
  return c.json(await contentStatus(redis));
});
