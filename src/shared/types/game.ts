// Platform-wide types shared by every mini-game (Who Said That?, future Reddit Courtroom, ...).
// Keep this file tiny: only add a type here once a second game actually needs it.

export type GameId = 'who-said-that'; // TODO(P2): add 'courtroom' when Reddit Courtroom starts.

export type GameMode = 'daily' | 'party';

/** UTC calendar day, e.g. "2026-11-21". The single key for all daily content. */
export type DateKey = string;

export type ApiError = {
  status: 'error';
  message: string;
};
