import { test } from 'node:test';
import assert from 'node:assert/strict';
import seed from './seed-cases.json' with { type: 'json' };
import {
  buildChoices,
  dayNumber,
  orderCandidates,
  seededShuffle,
  toPublic,
  validateSeedCases,
  type SeedCase,
} from './cases.ts';
import { SAMPLE_QUESTIONS } from './sampleQuestions.ts';

void test('seed-cases.json is valid', () => {
  assert.deepEqual(validateSeedCases(seed as SeedCase[]), []);
});

void test('validateSeedCases catches common mistakes', () => {
  const bad: SeedCase[] = [
    { id: 'c-001', commentId: 't1_abc', answer: 'cats', distractors: ['dogs', 'r/pets'], explanation: 'x', addedBy: 't' },
    { id: 'c-001', commentId: 't1_abc', answer: 'cats', distractors: ['Cats', 'dogs', 'pets'], explanation: 'long enough', addedBy: 't' },
  ];
  const errors = validateSeedCases(bad).join('\n');
  assert.match(errors, /exactly 3 distractors/);
  assert.match(errors, /no "r\/"/);
  assert.match(errors, /explanation is missing/);
  assert.match(errors, /duplicate id/);
  assert.match(errors, /duplicate commentId/);
  assert.match(errors, /must all differ/);
});

void test('seededShuffle is stable per seed and keeps all items', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.deepEqual(seededShuffle(items, 'x'), seededShuffle(items, 'x'));
  assert.deepEqual([...seededShuffle(items, 'x')].sort(), items);
  assert.notDeepEqual(seededShuffle(items, '2026-11-22'), seededShuffle(items, '2026-11-23'));
});

void test('answer position varies across cases', () => {
  const positions = new Set(
    (seed as SeedCase[]).map((c) => buildChoices(c.answer, c.distractors, c.id).indexOf(c.answer))
  );
  assert.ok(positions.size >= 3, `answer always lands in ${[...positions].join(',')}`);
});

void test('orderCandidates puts unused cases first, then least recently used', () => {
  const ids = ['c-001', 'c-002', 'c-003', 'c-004'];
  const used = new Map([
    ['c-001', 20261122],
    ['c-003', 20261120],
  ]);
  const order = orderCandidates(ids, used, '2026-11-23');
  assert.deepEqual([...order.slice(0, 2)].sort(), ['c-002', 'c-004']);
  assert.deepEqual(order.slice(2), ['c-003', 'c-001']);
});

void test('dayNumber and toPublic', () => {
  assert.equal(dayNumber('2026-11-22'), 20261122);
  const pub = toPublic(SAMPLE_QUESTIONS[0]!);
  assert.deepEqual(Object.keys(pub).sort(), ['body', 'choices', 'id', 'source']);
});
