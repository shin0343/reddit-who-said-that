import type { HintKind, PublicQuestion, RoundResult } from './contracts';

export const PARTY = {
  rounds: 5,
  roundMs: 20_000,
  revealMs: 5_000,
  roomTtlMs: 2 * 60 * 60 * 1000,
  codeLength: 12,
};

export const roomChannel = (code: string) => `wst_room_${code}`;

export type HintValues = Partial<Record<HintKind, string>>;

export type PartyAction =
  | { type: 'sync' | 'start' }
  | { type: 'leave'; seat: number }
  | { type: 'ready'; seat: number; revision: number; ready: boolean }
  | { type: 'guess'; round: number; choice: string }
  | { type: 'hint'; round: number; kind: HintKind };

export type PartyStatus =
  'LOBBY' | 'ROUND_ACTIVE' | 'ROUND_REVEAL' | 'FINISHED' | 'CLOSED';

export type PartyPlayer = {
  seat: number;
  name: string;
  ready: boolean;
  answered: boolean;
  left: boolean;
  score: number;
  rank: number;
  rankChange?: number;
};

export type PartyReveal = RoundResult & {
  counts: Record<string, number>;
  responses: number;
  missed: number;
  popularWrong: string[];
  pick: string | null;
  hintsUsed?: HintKind[];
  permalink?: string;
};

export type PartySnapshot = {
  code: string;
  content: 'reddit' | 'fictional';
  version: number;
  status: PartyStatus;
  closeReason: 'content' | null;
  serverNow: number;
  expiresAt: number;
  hostSeat: number;
  mySeat: number;
  myReadyRevision: number;
  players: PartyPlayer[];
  round: number;
  deadline: number | null;
  question: PublicQuestion | null;
  hints: HintValues;
  availableHints: HintKind[];
  myPick: string | null;
  reveal: PartyReveal | null;
};
