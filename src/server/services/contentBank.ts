import type {
  ContentEntry,
  ContentPool,
  ContentStatus,
  PackMode,
} from '../../shared/games/who-said-that/community.ts';
import { seededShuffle } from '../games/who-said-that/cases.ts';
import { PARTY } from '../../shared/games/who-said-that/party.ts';
import type { QuestionRecord } from '../../shared/games/who-said-that/contracts.ts';
import { consentKey, verifyConsent } from './consent.ts';
import { DAY_MS, dayOffset, expiryForDay, todayKey } from './dateKey.ts';
import {
  deleteWrite,
  GameError,
  jsonWrite,
  readJson,
  readMany,
  withWatchedKeys,
  type GameStore,
  type ReadManyStore,
} from './watched.ts';

export const BANK_KEY = 'wst:bank:v2';
export const snapshotKey = (id: string) => `wst:q:${id}`;
export const dailyKey = (day: string) => `wst:daily:${day}`;
const SNAPSHOT_MS = 7 * DAY_MS;
const BANK_LIMIT = 200;
const BANK_TTL = 365 * DAY_MS;

export type StoredPack = {
  qids: string[];
  createdAt: number;
  mode?: PackMode;
  version?: number;
  withdrawn?: boolean;
};

export const readBank = async (store: GameStore): Promise<ContentEntry[]> =>
  (await readJson<ContentEntry[]>(store, BANK_KEY)) ?? [];

export const readQuestion = (store: GameStore, id: string) =>
  readJson<QuestionRecord>(store, snapshotKey(id));

export const playableEntries = (
  entries: ContentEntry[],
  pool: ContentPool,
  now: number
) =>
  entries.filter(
    (entry) =>
      entry.pool === pool &&
      entry.status === 'approved' &&
      !!entry.permission &&
      now - entry.checkedAt < SNAPSHOT_MS
  );

export async function contentStatus(
  store: ReadManyStore,
  now = Date.now()
): Promise<ContentStatus> {
  const entries = await readBank(store);
  const fresh = [
    ...playableEntries(entries, 'daily', now),
    ...playableEntries(entries, 'party', now),
  ];
  const snapshots = await readMany<QuestionRecord>(
    store,
    fresh.map(({ id }) => snapshotKey(id))
  );
  const available = fresh.filter((_, index) => !!snapshots[index]);
  const daily = available.filter((entry) => entry.pool === 'daily').length;
  return {
    entries,
    daily,
    party: available.length - daily,
    distinctDailyPacks: Math.floor(daily / 5),
  };
}

export async function approveContent(
  store: GameStore,
  entry: ContentEntry,
  record: QuestionRecord,
  now: number
) {
  return withWatchedKeys(
    store,
    [BANK_KEY, snapshotKey(entry.id), consentKey(entry.commentId)],
    async () => {
      await verifyConsent(store, entry.commentId, entry.permission);
      const entries = await readBank(store);
      const previous = entries.filter(
        (item) => item.commentId === entry.commentId
      );
      if (previous.some((item) => item.pool !== entry.pool)) {
        throw new GameError('This comment belongs to the other pool.');
      }
      if (previous.some((item) => item.status === 'approved'))
        return { value: undefined };
      if (
        entries.filter((item) => item.status === 'approved').length >=
        BANK_LIMIT
      ) {
        throw new GameError(
          'Remove an existing case before approving another.'
        );
      }
      return {
        value: undefined,
        writes: [
          jsonWrite(BANK_KEY, [...entries, entry], now + BANK_TTL),
          jsonWrite(snapshotKey(entry.id), record, now + SNAPSHOT_MS),
        ],
      };
    }
  );
}

export async function refreshContent(
  store: GameStore,
  entry: ContentEntry,
  record: QuestionRecord,
  now: number
) {
  return withWatchedKeys(store, [BANK_KEY, snapshotKey(entry.id)], async () => {
    const entries = await readBank(store);
    const current = entries.find((item) => item.id === entry.id);
    if (current?.status !== 'approved' || current.checkedAt >= now)
      return { value: undefined };
    return {
      value: undefined,
      writes: [
        jsonWrite(
          BANK_KEY,
          entries.map((item) =>
            item.id === entry.id ? { ...item, checkedAt: now } : item
          ),
          now + BANK_TTL
        ),
        jsonWrite(snapshotKey(entry.id), record, now + SNAPSHOT_MS),
      ],
    };
  });
}

export async function withdrawContent(
  store: GameStore,
  sourceId: string,
  reason: string,
  now = Date.now(),
  legacyIds: string[] = []
) {
  const today = todayKey(new Date(now));
  const days = [today, dayOffset(today, 1)];
  return withWatchedKeys(store, [BANK_KEY, ...days.map(dailyKey)], async () => {
    const entries = await readBank(store);
    const affected = entries.filter(
      (entry) =>
        entry.status === 'approved' &&
        [entry.id, entry.commentId, entry.postId].includes(sourceId)
    );
    const ids = new Set([...affected.map((entry) => entry.id), ...legacyIds]);
    if (!ids.size) return { value: 0 };
    const writes = [...ids].map((id) => deleteWrite(snapshotKey(id)));
    if (affected.length) {
      writes.push(
        jsonWrite(
          BANK_KEY,
          entries.map((entry) =>
            ids.has(entry.id)
              ? { ...entry, status: 'withdrawn', checkedAt: now, reason }
              : entry
          ),
          now + BANK_TTL
        )
      );
    }
    for (const day of days) {
      const pack = await readJson<StoredPack>(store, dailyKey(day));
      if (pack && !pack.withdrawn && pack.qids.some((id) => ids.has(id))) {
        writes.push(
          jsonWrite(
            dailyKey(day),
            { ...pack, mode: 'practice', withdrawn: true },
            expiryForDay(day)
          )
        );
      }
    }
    return { value: affected.length, writes };
  });
}

export async function availablePartyIds(
  store: GameStore,
  seed: string,
  now: number
) {
  const entries = playableEntries(await readBank(store), 'party', now);
  const candidates = seededShuffle(
    entries.map((entry) => entry.id),
    seed
  ).slice(0, PARTY.rounds);
  if (candidates.length < PARTY.rounds) return [];
  const records = await Promise.all(
    candidates.map((id) => readQuestion(store, id))
  );
  return records.every(Boolean) ? candidates : [];
}
