import type {
  DailyPackInfo,
  Difficulty,
} from '../../shared/games/who-said-that/community.ts';
import {
  WST,
  type QuestionRecord,
} from '../../shared/games/who-said-that/contracts.ts';
import {
  buildChoices,
  dayNumber,
  orderCandidates,
} from '../games/who-said-that/cases.ts';
import {
  FICTIONAL,
  fictionalDailyIds,
  fictionalQuestion,
} from '../content/fictional/index.ts';
import { SAMPLE_QUESTIONS } from '../games/who-said-that/sampleQuestions.ts';
import {
  BANK_KEY,
  dailyKey,
  playableEntries,
  readBank,
  snapshotKey,
  type StoredPack,
} from './contentBank.ts';
import { DAY_MS, dayOffset, expiryForDay } from './dateKey.ts';
import {
  jsonWrite,
  readJson,
  readMany,
  withWatchedKeys,
  type ReadManyStore,
} from './watched.ts';

const USED_KEY = 'wst:used:v2';
const VERSION = 1;
const reservePack = SAMPLE_QUESTIONS.map((q) => ({
  ...q,
  choices: buildChoices(
    q.answerSubreddit,
    q.choices.filter((c) => c !== q.answerSubreddit),
    q.id
  ),
}));

export type Daily = {
  dateKey: string;
  pack: DailyPackInfo;
  qids: string[];
  questions: (QuestionRecord | null)[];
  tutorial?: true;
};

async function ensurePack(
  store: ReadManyStore,
  dateKey: string,
  now: number
): Promise<StoredPack> {
  const key = dailyKey(dateKey);
  const existing = await readJson<StoredPack>(store, key);
  if (existing) return existing;

  return withWatchedKeys(store, [key, BANK_KEY, USED_KEY], async () => {
    const saved = await readJson<StoredPack>(store, key);
    if (saved) return { value: saved };
    const entries = playableEntries(await readBank(store), 'daily', now);
    const used =
      (await readJson<Record<string, number>>(store, USED_KEY)) ?? {};
    const order = orderCandidates(
      entries.map((entry) => entry.id),
      new Map(Object.entries(used)),
      dateKey
    );
    const records = await readMany<QuestionRecord>(
      store,
      order.map(snapshotKey)
    );
    const available = order.filter((_, index) => !!records[index]);
    const fresh = available.filter((id) => used[id] === undefined);
    const cutoff = dayNumber(dayOffset(dateKey, -7));
    const rested = available.filter((id) => (used[id] ?? 0) <= cutoff);
    const eligible =
      fresh.length >= WST.roundsPerDaily
        ? fresh
        : rested.length >= WST.roundsPerDaily
          ? rested
          : available.slice(0, WST.roundsPerDaily);
    const selected: string[] = [];
    const difficultyById = new Map(
      entries.map((entry) => [entry.id, entry.difficulty])
    );
    const preferred: Difficulty[] = [
      'easy',
      'medium',
      'medium',
      'hard',
      'medium',
    ];
    for (const difficulty of preferred) {
      const next = eligible.find(
        (id) => !selected.includes(id) && difficultyById.get(id) === difficulty
      );
      if (next) selected.push(next);
    }
    for (const id of eligible) {
      if (selected.length >= WST.roundsPerDaily) break;
      if (!selected.includes(id)) selected.push(id);
    }
    const official = selected.length === WST.roundsPerDaily;
    const pack: StoredPack = {
      qids: official ? selected : fictionalDailyIds(dateKey),
      createdAt: now,
      version: VERSION,
      mode: official ? 'official' : 'fictional',
    };
    const writes = [jsonWrite(key, pack, expiryForDay(dateKey))];
    if (official) {
      for (const id of selected) used[id] = dayNumber(dateKey);
      writes.push(jsonWrite(USED_KEY, used, now + 90 * DAY_MS));
    }
    return { value: pack, writes };
  });
}

export async function getOrCreateDaily(
  store: ReadManyStore,
  dateKey: string,
  now = Date.now()
): Promise<Daily> {
  const stored = await ensurePack(store, dateKey, now);
  const records =
    stored.mode && stored.mode !== 'fictional'
      ? await readMany<QuestionRecord>(store, stored.qids.map(snapshotKey))
      : [];
  const questions = stored.qids.map(
    (id, i) =>
      fictionalQuestion(id, dateKey + id) ??
      reservePack.find((q) => q.id === id) ??
      records[i] ??
      null
  );
  const unavailable = questions.some((record) => !record);
  // Legacy packs have no approval evidence. Keep order and withhold old Reddit content.
  const withdrawn = stored.withdrawn === true || unavailable;
  if (unavailable && stored.mode === 'official') {
    const key = dailyKey(dateKey);
    await withWatchedKeys(store, [key], async () => {
      const pack = await readJson<StoredPack>(store, key);
      return {
        value: undefined,
        writes:
          pack?.mode === 'official'
            ? [
                jsonWrite(
                  key,
                  { ...pack, mode: 'practice', withdrawn: true },
                  expiryForDay(dateKey)
                ),
              ]
            : [],
      };
    });
  }
  return {
    dateKey,
    qids: stored.qids,
    questions,
    pack: {
      id: `wst-${dateKey}`,
      version: stored.version ?? 0,
      mode: withdrawn ? 'practice' : (stored.mode ?? 'practice'),
      withdrawn,
    },
  };
}

export function getPracticeDaily(dateKey: string): Daily {
  const qids = FICTIONAL.tutorial.map((question) => question.id);
  return {
    dateKey,
    qids,
    tutorial: true,
    pack: {
      id: `wst-practice-${dateKey}`,
      version: VERSION,
      mode: 'practice',
      withdrawn: false,
    },
    questions: qids.map((id) => fictionalQuestion(id) ?? null),
  };
}
