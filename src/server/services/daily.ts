import { redis } from '@devvit/web/server';
import { WST, type QuestionRecord } from '../../shared/games/who-said-that/contracts.ts';
import seedJson from '../games/who-said-that/seed-cases.json' with { type: 'json' };
import { buildChoices, dayNumber, orderCandidates, type SeedCase } from '../games/who-said-that/cases.ts';
import { SAMPLE_QUESTIONS } from '../games/who-said-that/sampleQuestions.ts';
import { loadCase, readSnapshots } from '../providers/questions.ts';

// Today's case set. Created once per UTC day per subreddit, then the same for everyone.
// Keys: docs/ARCHITECTURE.md §4.

const SEED: readonly SeedCase[] = seedJson as SeedCase[];
const DAILY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const USED_KEY = 'wst:used';
export const dailyKey = (dateKey: string) => `wst:daily:${dateKey}`;

type StoredDaily = { qids: string[]; createdAt: number };

export type Daily = {
  dateKey: string;
  questions: QuestionRecord[];
  /** Why seed cases were skipped while building the day (for logs / mod tools). */
  skipped: { id: string; reason: string }[];
};

/** Fictional fallback, with choices shuffled so the answer isn't always first. */
const sampleRecord = (id: string): QuestionRecord | null => {
  const s = SAMPLE_QUESTIONS.find((q) => q.id === id);
  if (!s) return null;
  const distractors = s.choices.filter((c) => c !== s.answerSubreddit);
  return { ...s, choices: buildChoices(s.answerSubreddit, distractors, s.id) };
};

/** Rebuild one question of an existing day: snapshot first, then live reload, then sample. */
const resolveQuestion = async (qid: string, snapshot: QuestionRecord | null): Promise<QuestionRecord | null> => {
  if (snapshot) return snapshot;
  const sample = sampleRecord(qid);
  if (sample) return sample;
  const seed = SEED.find((c) => c.id === qid);
  if (!seed) return null;
  const loaded = await loadCase(seed);
  return loaded.ok ? loaded.record : null;
};

const readDaily = async (dateKey: string): Promise<StoredDaily | null> => {
  const raw = await redis.get(dailyKey(dateKey));
  return raw ? (JSON.parse(raw) as StoredDaily) : null;
};

const questionsFor = async (stored: StoredDaily): Promise<QuestionRecord[]> => {
  const snapshots = await readSnapshots(stored.qids);
  const out = await Promise.all(stored.qids.map((qid, i) => resolveQuestion(qid, snapshots[i] ?? null)));
  return out.filter((q): q is QuestionRecord => q !== null);
};

/** Idempotent: the first call of the day builds the set, later calls return the same one. */
export const getOrCreateDaily = async (dateKey: string): Promise<Daily> => {
  const existing = await readDaily(dateKey);
  if (existing) return { dateKey, questions: await questionsFor(existing), skipped: [] };

  const used = await redis.zRange(USED_KEY, 0, -1, { by: 'rank' });
  const usedOn = new Map(used.map((u) => [u.member, u.score]));
  const order = orderCandidates(
    SEED.map((c) => c.id),
    usedOn,
    dateKey
  );

  const picked: QuestionRecord[] = [];
  const skipped: Daily['skipped'] = [];
  for (const id of order) {
    if (picked.length >= WST.roundsPerDaily) break;
    const loaded = await loadCase(SEED.find((c) => c.id === id)!);
    if (loaded.ok) picked.push(loaded.record);
    else skipped.push({ id, reason: loaded.reason });
  }
  for (const s of SAMPLE_QUESTIONS) {
    if (picked.length >= WST.roundsPerDaily) break;
    picked.push(sampleRecord(s.id)!);
  }
  if (skipped.length > 0) console.warn('[daily] skipped cases', dateKey, skipped);

  const mine: StoredDaily = { qids: picked.map((q) => q.id), createdAt: Date.now() };
  await redis.set(dailyKey(dateKey), JSON.stringify(mine), {
    nx: true,
    expiration: new Date(Date.now() + DAILY_TTL_MS),
  });

  // Another request may have created the day at the same moment: whatever is stored wins.
  const stored = (await readDaily(dateKey)) ?? mine;
  if (stored.createdAt !== mine.createdAt || stored.qids.join() !== mine.qids.join()) {
    return { dateKey, questions: await questionsFor(stored), skipped };
  }
  const real = picked.filter((q) => q.source === 'reddit');
  if (real.length > 0) {
    await redis.zAdd(USED_KEY, ...real.map((q) => ({ member: q.id, score: dayNumber(dateKey) })));
  }
  return { dateKey, questions: picked, skipped };
};

/** Dev/mod helper: forget today's set so the next call rebuilds it. */
export const resetDaily = async (dateKey: string): Promise<void> => {
  const stored = await readDaily(dateKey);
  await redis.del(dailyKey(dateKey));
  if (stored) await redis.zRem(USED_KEY, stored.qids);
};
