import { WST, type HintKind } from '../../../shared/games/who-said-that/contracts.ts';

export type ScoreInput = {
  correct: boolean;
  hintsUsed: readonly HintKind[];
  /** ms between the server issuing the round and receiving the guess. */
  elapsedMs: number;
};

/** Server-authoritative round score. Pure so it can be unit-tested and reused by Party Room. */
export const scoreRound = ({ correct, hintsUsed, elapsedMs }: ScoreInput): number => {
  if (!correct) return 0;
  const remaining = Math.max(0, WST.speedBonusWindowMs - Math.max(0, elapsedMs));
  const speedBonus = Math.round((WST.maxSpeedBonus * remaining) / WST.speedBonusWindowMs);
  const hints = Math.min(hintsUsed.length, WST.maxHintsPerRound);
  return Math.max(10, WST.baseCorrectPoints + speedBonus - hints * WST.hintCost);
};
