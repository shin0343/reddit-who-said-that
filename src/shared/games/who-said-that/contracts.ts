// Who Said That? client <-> server contract. Rules live in docs/GAME_DESIGN.md.
// Answers are serialized only during the reveal phase.

import type { DateKey, GameMode } from '../../types/game';
import type {
  CommunityResults,
  DailyPackInfo,
  Difficulty,
  FictionalPool,
} from './community';

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

export type HintKind = 'thread-title' | 'eliminate-one' | 'culture';

/** Where a comment came from. `fictional` cases are original fiction and must be labeled in UI. */
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
  cultureHint?: string;
  difficulty?: Difficulty;
  pool?: FictionalPool;
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
  /** Share of submitted guesses per choice, 0..1. */
  distribution: Record<string, number>;
};

export type WstMetaResponse = {
  type: 'wst-meta';
  dateKey: DateKey;
  modes: GameMode[];
  rounds: number;
  usesSampleContent: boolean;
  username: string | null;
  canCurate: boolean;
};

/** Public catalog response for GET /api/wst/daily. */
export type WstDailyResponse = {
  type: 'wst-daily';
  dateKey: DateKey;
  questions: PublicQuestion[];
  pack: DailyPackInfo;
  usesSampleContent: boolean;
};

export type DailyAction =
  | { type: 'open' }
  | { type: 'next'; dateKey: DateKey; questionId: string }
  | { type: 'guess'; dateKey: DateKey; questionId: string; choice: string }
  | { type: 'hint'; dateKey: DateKey; questionId: string; kind: HintKind };

export type DailyResult = Omit<RoundResult, 'distribution'> & {
  pick: string;
  hintsUsed?: HintKind[];
  permalink?: string;
};

export type DailyProgress = {
  dateKey: DateKey;
  round: number;
  question: PublicQuestion | null;
  hints: Partial<Record<HintKind, string>>;
  availableHints: HintKind[];
  reveal: DailyResult | null;
  total: number;
  outcomes: (boolean | null)[];
  pack: DailyPackInfo;
  serverNow: number;
  nextDailyAt: number;
  finished: boolean;
  community: CommunityResults | null;
};
