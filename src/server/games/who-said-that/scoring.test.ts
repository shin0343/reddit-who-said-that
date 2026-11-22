import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreRound } from './scoring.ts';

void test('wrong answer scores 0', () => {
  assert.equal(scoreRound({ correct: false, hintsUsed: [], elapsedMs: 0 }), 0);
});

void test('instant correct answer gets full speed bonus', () => {
  assert.equal(scoreRound({ correct: true, hintsUsed: [], elapsedMs: 0 }), 150);
});

void test('slow correct answer with two hints keeps a floor', () => {
  assert.equal(scoreRound({ correct: true, hintsUsed: ['thread-title', 'eliminate-one'], elapsedMs: 60_000 }), 40);
});
