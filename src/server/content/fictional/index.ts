import dailyJson from './daily.json' with { type: 'json' };
import partyJson from './party.json' with { type: 'json' };
import tutorialJson from './tutorial.json' with { type: 'json' };
import type {
  Difficulty,
  FictionalPool,
} from '../../../shared/games/who-said-that/community.ts';
import {
  WST,
  type QuestionRecord,
} from '../../../shared/games/who-said-that/contracts.ts';
import { seededShuffle } from '../../games/who-said-that/cases.ts';
import { DAY_MS } from '../../services/dateKey.ts';

type AuthoredRow = (typeof dailyJson)[number];
type FictionalQuestion = QuestionRecord & {
  cultureHint: string;
  difficulty: Difficulty;
  pool: FictionalPool;
};

function load(rows: AuthoredRow[], pool: FictionalPool): FictionalQuestion[] {
  return rows.map((row) => {
    const { difficulty } = row;
    if (
      row.source !== 'fictional' ||
      row.pool !== pool ||
      (difficulty !== 'easy' &&
        difficulty !== 'medium' &&
        difficulty !== 'hard')
    ) {
      throw new Error(`Invalid fictional content metadata for ${row.id}`);
    }
    return {
      ...row,
      pool,
      difficulty,
      source: 'fictional',
      sourceRef: { kind: 'fictional' },
    };
  });
}

export const FICTIONAL = {
  daily: load(dailyJson, 'daily'),
  party: load(partyJson, 'party'),
  tutorial: load(tutorialJson, 'tutorial'),
};

const records = new Map(
  Object.values(FICTIONAL)
    .flat()
    .map((question) => [question.id, question])
);
export function fictionalQuestion(id: string, seed = id) {
  const question = records.get(id);
  return question
    ? { ...question, choices: seededShuffle(question.choices, seed) }
    : undefined;
}

// Append complete groups of five. Any uninterrupted cycle visits every group once.
function groupAt(questions: FictionalQuestion[], index: number): string[] {
  const size = WST.roundsPerDaily;
  const groups = Math.floor(questions.length / size);
  const offset = (((index % groups) + groups) % groups) * size;
  return questions.slice(offset, offset + size).map((question) => question.id);
}

const ROTATION_EPOCH = Date.parse('2026-11-27');
export const fictionalDailyIds = (day: string) =>
  groupAt(FICTIONAL.daily, (Date.parse(day) - ROTATION_EPOCH) / DAY_MS);
export const fictionalPartyIds = (index: number, seed: string) =>
  seededShuffle(groupAt(FICTIONAL.party, index), seed);
