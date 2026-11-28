import type { DateKey } from '../../shared/types/game.ts';

/** Daily content rolls over at 00:00 UTC for everyone. */
export const todayKey = (now: Date = new Date()): DateKey =>
  now.toISOString().slice(0, 10);

export const DAY_MS = 86_400_000;
export const dayOffset = (key: DateKey, offset: number): DateKey =>
  todayKey(new Date(Date.parse(key) + offset * DAY_MS));
export const expiryForDay = (key: DateKey): number =>
  Date.parse(key) + 30 * DAY_MS;
