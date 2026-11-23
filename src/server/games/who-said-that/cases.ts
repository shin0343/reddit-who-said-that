// Pure case logic: seed validation, deterministic shuffles, daily candidate order.
// No Devvit imports, so everything here runs under `node --test`.

import { WST, type PublicQuestion, type QuestionRecord } from '../../../shared/games/who-said-that/contracts.ts';

/** One entry of seed-cases.json. See docs/DEVELOPMENT_ROADMAP.md for the schema. */
export type SeedCase = {
  id: string;
  commentId: `t1_${string}`;
  answer: string;
  distractors: string[];
  explanation: string;
  addedBy: string;
};

/** Returns human-readable problems with the seed bank; empty means valid. */
export const validateSeedCases = (cases: readonly SeedCase[]): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  const commentIds = new Set<string>();
  for (const c of cases) {
    const at = `case ${c.id}`;
    if (!/^c-\d{3,}$/.test(c.id)) errors.push(`${at}: id must look like c-001`);
    if (ids.has(c.id)) errors.push(`${at}: duplicate id`);
    ids.add(c.id);
    if (!/^t1_[a-z0-9]+$/.test(c.commentId)) errors.push(`${at}: commentId must look like t1_abc123`);
    if (commentIds.has(c.commentId)) errors.push(`${at}: duplicate commentId`);
    commentIds.add(c.commentId);
    const names = [c.answer, ...c.distractors].map((n) => n.toLowerCase());
    if (c.distractors.length !== WST.choicesPerRound - 1) {
      errors.push(`${at}: needs exactly ${WST.choicesPerRound - 1} distractors`);
    }
    if (new Set(names).size !== names.length) errors.push(`${at}: answer and distractors must all differ`);
    if (names.some((n) => !/^[a-z0-9_]{2,21}$/.test(n))) errors.push(`${at}: subreddit names have no "r/" and no spaces`);
    if (c.explanation.trim().length < 10) errors.push(`${at}: explanation is missing`);
  }
  return errors;
};

/** Small seeded PRNG (mulberry32) keyed by a string, so every player sees the same order. */
const rng = (seed: string): (() => number) => {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const seededShuffle = <T>(items: readonly T[], seed: string): T[] => {
  const out = [...items];
  const next = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
};

/** The 4 choices in a stable, answer-independent order. */
export const buildChoices = (answer: string, distractors: readonly string[], seed: string): string[] =>
  seededShuffle([answer, ...distractors], `choices:${seed}`);

/**
 * Order in which to try cases for a day: never-used cases first (shuffled by date),
 * then used ones, least recently used first. The caller takes the first N that validate.
 * `usedOn` maps case id -> day number it was last used (e.g. 20261122).
 */
export const orderCandidates = (
  caseIds: readonly string[],
  usedOn: ReadonlyMap<string, number>,
  dateKey: string
): string[] => {
  const shuffled = seededShuffle(caseIds, `daily:${dateKey}`);
  const fresh = shuffled.filter((id) => !usedOn.has(id));
  const used = shuffled.filter((id) => usedOn.has(id)).sort((a, b) => usedOn.get(a)! - usedOn.get(b)!);
  return [...fresh, ...used];
};

/** "2026-11-22" -> 20261122, used as a sortable Redis score. */
export const dayNumber = (dateKey: string): number => Number(dateKey.replaceAll('-', ''));

/** Strip everything the client must not see before guessing. */
export const toPublic = (q: QuestionRecord): PublicQuestion => ({
  id: q.id,
  body: q.body,
  choices: q.choices,
  source: q.source,
});
