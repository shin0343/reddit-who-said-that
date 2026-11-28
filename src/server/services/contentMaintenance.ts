import { redis } from '@devvit/web/server';
import { randomUUID } from 'node:crypto';
import seedCases from '../games/who-said-that/seed-cases.json' with { type: 'json' };
import { verifyConsent } from './consent.ts';
import { loadCase } from '../providers/questions.ts';
import type { ContentEntry } from '../../shared/games/who-said-that/community.ts';
import {
  contentStatus,
  readBank,
  readQuestion,
  refreshContent,
  withdrawContent,
} from './contentBank.ts';
import { getOrCreateDaily } from './daily.ts';
import { DAY_MS, dayOffset, todayKey } from './dateKey.ts';
import {
  deleteWrite,
  GameError,
  jsonWrite,
  readJson,
  withWatchedKeys,
} from './watched.ts';

export const legacyCaseIds = (commentId: string) =>
  seedCases
    .filter((seed) => seed.commentId === commentId)
    .map((seed) => seed.id);

async function revalidate(entry: ContentEntry) {
  try {
    await verifyConsent(redis, entry.commentId, entry.permission);
  } catch (error) {
    if (!(error instanceof GameError)) throw error;
    await withdrawContent(redis, entry.id, error.message);
    return;
  }
  const previous = await readQuestion(redis, entry.id);
  if (!previous) {
    await withdrawContent(redis, entry.id, 'Snapshot expired');
    return;
  }
  const checked = await loadCase({
    id: entry.id,
    commentId: entry.commentId,
    distractors: previous.choices.filter(
      (candidate) => candidate !== previous.answerSubreddit
    ),
    explanation: previous.explanation,
  });
  if (!checked.ok) {
    if (checked.temporary) throw new GameError(checked.reason, 503);
    await withdrawContent(redis, entry.id, checked.reason);
    return;
  }
  // An edited source requires a new review. Never change an issued case in place.
  if (
    checked.record.body !== previous.body ||
    checked.record.threadTitle !== previous.threadTitle ||
    checked.record.answerSubreddit !== previous.answerSubreddit ||
    checked.postId !== entry.postId
  ) {
    await withdrawContent(redis, entry.id, 'Source changed');
    return;
  }
  await refreshContent(redis, entry, previous, Date.now());
}

export async function loadDaily(dateKey: string) {
  const daily = await getOrCreateDaily(redis, dateKey);
  const readyKey = `wst:daily-checked:v2:${dateKey}`;
  if (daily.pack.mode !== 'official' || (await redis.get(readyKey)))
    return daily;

  const lockKey = `wst:daily-checking:${dateKey}`;
  const token = randomUUID();
  const acquired = await redis.set(lockKey, JSON.stringify(token), {
    nx: true,
    expiration: new Date(Date.now() + 24_000),
  });
  if (acquired !== 'OK') {
    if (await redis.get(readyKey)) return getOrCreateDaily(redis, dateKey);
    throw new GameError(
      'Today’s sources are being checked. Try again shortly.',
      503
    );
  }
  try {
    const entries = (await readBank(redis)).filter(
      (entry) => entry.status === 'approved' && daily.qids.includes(entry.id)
    );
    const results = await Promise.allSettled(entries.map(revalidate));
    if (results.some((result) => result.status === 'rejected')) {
      throw new GameError(
        'Could not verify today’s sources. Try again shortly.',
        503
      );
    }
    await redis.set(readyKey, '1', {
      expiration: new Date(Date.parse(dateKey) + DAY_MS),
    });
    return await getOrCreateDaily(redis, dateKey);
  } finally {
    await withWatchedKeys(redis, [lockKey], async () => ({
      value: undefined,
      writes:
        (await readJson<string>(redis, lockKey)) === token
          ? [deleteWrite(lockKey)]
          : [],
    }));
  }
}

export async function prepareTomorrow() {
  const tomorrow = dayOffset(todayKey(), 1);
  if ((await contentStatus(redis)).distinctDailyPacks === 0) return;
  // Check selected sources before their day, then recheck during activation.
  const daily = await getOrCreateDaily(redis, tomorrow);
  if (daily.pack.mode !== 'official') return;
  const entries = (await readBank(redis)).filter(
    (entry) => daily.qids.includes(entry.id) && entry.status === 'approved'
  );
  const results = await Promise.allSettled(entries.map(revalidate));
  if (results.some((result) => result.status === 'rejected'))
    throw new GameError('Some sources need another check.', 503);
}

export async function sweepContent() {
  const entries = (await readBank(redis)).filter(
    (entry) => entry.status === 'approved'
  );
  const cursorKey = 'wst:content:sweep-cursor';
  // Rotating slots ensure a temporarily inaccessible source never starves the rest.
  const size = 8;
  const ordered = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const batch = await withWatchedKeys(redis, [cursorKey], async () => {
    if (!ordered.length) return { value: [] };
    const cursor = await readJson<string>(redis, cursorKey);
    const next = ordered.findIndex((entry) => !cursor || entry.id > cursor);
    const start = next < 0 ? 0 : next;
    const selected = ordered.slice(start, start + size);
    return {
      value: selected,
      writes: [jsonWrite(cursorKey, selected.at(-1)?.id, Date.now() + DAY_MS)],
    };
  });
  const results = await Promise.allSettled(batch.map(revalidate));
  return {
    checked: batch.length,
    retry: results.filter((result) => result.status === 'rejected').length,
  };
}
