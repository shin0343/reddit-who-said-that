import { reddit, redis } from '@devvit/web/server';
import type { QuestionRecord } from '../../shared/games/who-said-that/contracts.ts';
import { buildChoices, type SeedCase } from '../games/who-said-that/cases.ts';
import { checkCaseBody, sanitizeCommentBody } from './redditText.ts';

// Turns a curated seed case into a QuestionRecord using the LIVE Reddit comment.
// See docs/ARCHITECTURE.md §6: validate, sanitize, snapshot (never the author).

const SNAPSHOT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const snapshotKey = (qid: string) => `wst:q:${qid}`;

export type LoadResult = { ok: true; record: QuestionRecord } | { ok: false; reason: string };

export const loadCase = async (seed: SeedCase): Promise<LoadResult> => {
  let comment;
  try {
    comment = await reddit.getCommentById(seed.commentId);
  } catch (error) {
    return { ok: false, reason: `fetch failed: ${String(error).slice(0, 120)}` };
  }
  if (comment.removed || comment.spam) return { ok: false, reason: 'removed' };
  if (comment.subredditName.toLowerCase() !== seed.answer.toLowerCase()) {
    return { ok: false, reason: `seed answer r/${seed.answer} but comment is in r/${comment.subredditName}` };
  }

  const body = sanitizeCommentBody(comment.body);
  const check = checkCaseBody(body, seed.answer);
  if (!check.ok) return { ok: false, reason: check.reason };

  let threadTitle: string;
  try {
    const post = await reddit.getPostById(comment.postId);
    if (post.nsfw) return { ok: false, reason: 'nsfw thread' };
    threadTitle = sanitizeCommentBody(post.title);
  } catch (error) {
    return { ok: false, reason: `thread fetch failed: ${String(error).slice(0, 120)}` };
  }

  const record: QuestionRecord = {
    id: seed.id,
    body,
    choices: buildChoices(comment.subredditName, seed.distractors, seed.id),
    source: 'reddit',
    answerSubreddit: comment.subredditName,
    threadTitle,
    explanation: seed.explanation,
    sourceRef: { kind: 'reddit', commentId: seed.commentId, permalink: comment.permalink },
  };
  await redis.set(snapshotKey(seed.id), JSON.stringify(record), {
    expiration: new Date(Date.now() + SNAPSHOT_TTL_MS),
  });
  return { ok: true, record };
};

export const readSnapshots = async (qids: readonly string[]): Promise<(QuestionRecord | null)[]> => {
  if (qids.length === 0) return [];
  const raw = await redis.mGet(qids.map(snapshotKey));
  return raw.map((s) => (s ? (JSON.parse(s) as QuestionRecord) : null));
};
