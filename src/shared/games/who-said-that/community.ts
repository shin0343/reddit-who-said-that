import type { DateKey } from '../../types/game';

export type PackMode = 'official' | 'fictional' | 'practice';
export type ContentPool = 'daily' | 'party';
export type RankedPackMode = Exclude<PackMode, 'practice'>;
export type FictionalPool = ContentPool | 'tutorial';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type DailyPackInfo = {
  id: string;
  version: number;
  mode: PackMode;
  withdrawn: boolean;
};

export type ContentPermission =
  | { kind: 'author-opt-in'; at: number }
  | { kind: 'documented'; reference: string; at: number };

export type ContentEntry = {
  id: string;
  commentId: `t1_${string}`;
  postId: `t3_${string}`;
  pool: ContentPool;
  difficulty: Difficulty;
  status: 'approved' | 'withdrawn';
  checkedAt: number;
  permission?: ContentPermission;
  reason?: string;
};

export type ContentStatus = {
  entries: ContentEntry[];
  daily: number;
  party: number;
  distinctDailyPacks: number;
};

export type BoardRow = {
  rank: number;
  score: number;
  correct: number;
  you: boolean;
};
export type DailyBrief = {
  dateKey: DateKey;
  mode: PackMode;
  progress: 'new' | 'in-progress' | 'finished';
  round: number;
  streak: number;
};

export type DailyBoard = {
  dateKey: DateKey;
  mode: PackMode;
  participants: number;
  personalRank: number | null;
  top: BoardRow[];
};

export type CaseStats = {
  round: number;
  answer: string;
  responses: number;
  distribution: Record<string, number>;
  correctRate: number;
  popularWrong: string[];
};
export type CommunityResults = {
  participants: number;
  top: BoardRow[];
  personalRank: number;
  percentile: number | null;
  cases: CaseStats[];
  hardest: number[];
  bestScore: number;
  streak: { current: number; longest: number; last: DateKey };
  shareText: string;
};
