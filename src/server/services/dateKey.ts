import type { DateKey } from '../../shared/types/game.ts';

/** Daily content rolls over at 00:00 UTC for everyone. */
export const todayKey = (now: Date = new Date()): DateKey => now.toISOString().slice(0, 10);
