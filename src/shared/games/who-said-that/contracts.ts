// Who Said That? client <-> server contract. Rules live in docs/GAME_DESIGN.md.
// The client NEVER receives `answerSubreddit` before it has submitted a guess for that round.

import type { DateKey, GameMode } from '../../types/game';

export const WST = {
  roundsPerDaily: 5,
  choicesPerRound: 4,
  baseCorrectPoints: 100,
  maxSpeedBonus: 50,
  speedBonusWindowMs: 20_000,
  hintCost: 30,
  maxHintsPerRound: 2,
  partyMinPlayers: 2,
  partyMaxPlayers: 6,
} as const;

export type HintKind = 'thread-title' | 'eliminate-one';

/** Where a comment came from. `fictional` samples are allowed only for dev/demo and must be labeled in UI. */
export type ContentSource =
  | { kind: 'fictional' }
  | { kind: 'reddit'; commentId: `t1_${string}`; permalink: string };

/** What the client sees while guessing. */
export type PublicQuestion = {
  id: string;
  body: string;
  choices: string[]; // subreddit names without "r/", length WST.choicesPerRound
  source: ContentSource['kind'];
};

/** Server-only record. Never serialize to the client before reveal. */
export type QuestionRecord = PublicQuestion & {
  answerSubreddit: string;
  threadTitle: string; // used by the 'thread-title' hint
  explanation: string; // shown on reveal: why this community says it this way
  sourceRef: ContentSource;
};

export type GuessRequest = {
  questionId: string;
  choice: string;
  hintsUsed: HintKind[];
};

export type RoundResult = {
  questionId: string;
  correct: boolean;
  answerSubreddit: string;
  points: number;
  explanation: string;
  /** Share of players per choice, 0..1. Filled from Redis in Phase 2. */
  distribution: Record<string, number>;
};

export type WstMetaResponse = {
  type: 'wst-meta';
  dateKey: DateKey;
  modes: GameMode[];
  rounds: number;
  usesSampleContent: boolean;
  username: string | null;
};

/** GET /api/wst/daily. Player progress is added in Phase 2. */
export type WstDailyResponse = {
  type: 'wst-daily';
  dateKey: DateKey;
  questions: PublicQuestion[];
  usesSampleContent: boolean;
};
