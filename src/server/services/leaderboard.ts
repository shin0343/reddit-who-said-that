import { createHash } from 'node:crypto';
import type {
  BoardRow,
  CaseStats,
  CommunityResults,
  DailyBoard,
  RankedPackMode,
} from '../../shared/games/who-said-that/community.ts';
import { voteDistribution } from '../games/who-said-that/round.ts';
import { dailyKey, type StoredPack } from './contentBank.ts';
import type { Daily } from './daily.ts';
import { dayOffset } from './dateKey.ts';
import { readJson, readMany, type ReadManyStore } from './watched.ts';

const SHARDS = 16;
export const RETAINED_DAYS = 30;
const MIN_SAMPLE = 5;

export type Completion = {
  score: number;
  correct: number;
  at: number;
  choices: string[];
};
export type BoardShard = Record<string, Completion>;
const shardKey = (day: string, shard: number, mode: RankedPackMode) =>
  `wst:lb:${mode === 'official' ? 'v2' : 'fictional'}:${day}:${shard}`;
export const playerShard = (
  day: string,
  uid: string,
  mode: RankedPackMode = 'official'
) =>
  shardKey(
    day,
    createHash('sha256').update(uid).digest().readUInt8(0) % SHARDS,
    mode
  );
export const playKey = (day: string, uid: string, tutorial = false) =>
  `wst:${tutorial ? 'practice' : 'play'}:${day}:${uid}`;
export const recentDays = (day: string) =>
  Array.from({ length: RETAINED_DAYS }, (_, offset) => dayOffset(day, -offset));

export function streakFor(
  days: string[],
  today: string
): CommunityResults['streak'] {
  const ordered = [...new Set(days)].sort();
  let run = 0;
  let longest = 0;
  let last = '';
  for (const day of ordered) {
    run = last && dayOffset(day, -1) === last ? run + 1 : 1;
    longest = Math.max(longest, run);
    last = day;
  }
  return {
    current: last === today || last === dayOffset(today, -1) ? run : 0,
    longest,
    last,
  };
}

function caseStatistics(daily: Daily, entries: Completion[]): CaseStats[] {
  if (entries.length < MIN_SAMPLE) return [];
  return daily.questions.flatMap((question, round) => {
    if (!question) return [];
    const counts = Object.fromEntries(
      question.choices.map((choice) => [
        choice,
        entries.filter((entry) => entry.choices[round] === choice).length,
      ])
    );
    const wrong = question.choices.filter(
      (choice) => choice !== question.answerSubreddit
    );
    const mostWrong = Math.max(...wrong.map((choice) => counts[choice] ?? 0));
    const distribution = voteDistribution(question.choices, counts);
    return [
      {
        round: round + 1,
        answer: question.answerSubreddit,
        distribution,
        responses: entries.length,
        correctRate: distribution[question.answerSubreddit] ?? 0,
        popularWrong: wrong.filter(
          (choice) => mostWrong > 0 && counts[choice] === mostWrong
        ),
      },
    ];
  });
}

const dayShards = (store: ReadManyStore, day: string, mode: RankedPackMode) =>
  readMany<BoardShard>(
    store,
    Array.from({ length: SHARDS }, (_, index) => shardKey(day, index, mode))
  );

export async function dailyHistory(
  store: ReadManyStore,
  day: string,
  uid: string,
  mode: RankedPackMode
) {
  const days = recentDays(day);
  const [history, packs] = await Promise.all([
    readMany<BoardShard>(
      store,
      days.map((date) => playerShard(date, uid, mode))
    ),
    readMany<StoredPack>(store, days.map(dailyKey)),
  ]);
  const valid = days.flatMap((date, i) => {
    const record = history[i]?.[uid];
    return record && packs[i]?.mode === mode && !packs[i]?.withdrawn
      ? [{ date, record }]
      : [];
  });
  return {
    validToday: packs[0]?.mode === mode && !packs[0]?.withdrawn,
    streak: streakFor(
      valid.map(({ date }) => date),
      day
    ),
    bestScore: Math.max(0, ...valid.map(({ record }) => record.score)),
  };
}

function rankBoard(shards: (BoardShard | null)[], uid: string | undefined) {
  const entries = shards.flatMap((shard) => Object.entries(shard ?? {}));
  entries.sort(([, a], [, b]) => b.score - a.score || a.at - b.at);
  let last: Completion | undefined;
  let rank = 0;
  const board: BoardRow[] = entries.map(([id, entry], index) => {
    if (entry.score !== last?.score || entry.at !== last.at) rank = index + 1;
    last = entry;
    return {
      rank,
      score: entry.score,
      correct: entry.correct,
      you: id === uid,
    };
  });
  return { entries, board };
}

export async function dailyBoard(
  store: ReadManyStore,
  daily: Daily,
  uid: string | undefined
): Promise<DailyBoard> {
  const {
    dateKey,
    pack: { mode },
  } = daily;
  const empty: DailyBoard = {
    dateKey,
    mode: 'practice',
    participants: 0,
    personalRank: null,
    top: [],
  };
  if (mode === 'practice') return empty;
  const shards = await dayShards(store, dateKey, mode);
  const current = await readJson<StoredPack>(store, dailyKey(dateKey));
  if (current?.mode !== mode || current.withdrawn) return empty;
  const { board } = rankBoard(shards, uid);
  return {
    dateKey,
    mode,
    participants: board.length,
    personalRank: board.find((row) => row.you)?.rank ?? null,
    top: board.slice(0, 10),
  };
}

// This function is only called after the viewer has completed every round.
export async function communityResults(
  store: ReadManyStore,
  daily: Daily,
  uid: string
): Promise<CommunityResults | null> {
  const { mode } = daily.pack;
  if (mode === 'practice') return null;
  const history = dailyHistory(store, daily.dateKey, uid, mode);
  const shards = dayShards(store, daily.dateKey, mode);
  const [records, scores] = await Promise.all([history, shards]);
  if (!records.validToday) return null;
  const { entries, board } = rankBoard(scores, uid);
  const mine = entries.find(([id]) => id === uid)?.[1];
  if (!mine) return null;
  const { streak } = records;
  const cases = caseStatistics(
    daily,
    entries.map(([, entry]) => entry)
  );
  const lowestRate = Math.min(...cases.map((stat) => stat.correctRate));
  const share = [
    `Who Said That? — ${mode === 'fictional' ? 'Community Detective' : 'Real Case Files'} #${daily.dateKey.replaceAll('-', '')}`,
    daily.questions
      .map((question, i) =>
        question?.answerSubreddit === mine.choices[i] ? '🟩' : '🟥'
      )
      .join(''),
    `${mine.correct}/${daily.questions.length} Cases Solved`,
    `Score: ${mine.score}`,
    `Streak: ${streak.current} ${streak.current === 1 ? 'day' : 'days'}`,
    '',
    'Can you beat my deductions?',
  ];
  return {
    participants: entries.length,
    top: board.slice(0, 10),
    personalRank: board.find((row) => row.you)?.rank ?? 0,
    percentile:
      entries.length >= MIN_SAMPLE
        ? Math.floor(
            (100 *
              entries.filter(([, entry]) => entry.score < mine.score).length) /
              (entries.length - 1)
          )
        : null,
    cases,
    hardest: cases
      .filter((stat) => stat.correctRate === lowestRate)
      .map((stat) => stat.round),
    bestScore: Math.max(mine.score, records.bestScore),
    streak,
    shareText: share.join('\n'),
  };
}
