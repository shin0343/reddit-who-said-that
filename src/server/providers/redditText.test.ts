import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCaseBody, parseCommentRef, sanitizeCommentBody } from './redditText.ts';

void test('parseCommentRef accepts ids and both URL formats', () => {
  assert.equal(parseCommentRef('t1_abc123'), 't1_abc123');
  assert.equal(parseCommentRef('  ABC123 '), 't1_abc123');
  assert.equal(
    parseCommentRef('https://www.reddit.com/r/castiron/comments/1x2y3z/comment/kq9w8e/?utm_source=share'),
    't1_kq9w8e'
  );
  assert.equal(parseCommentRef('https://www.reddit.com/r/castiron/comments/1x2y3z/is_my_pan_ruined/kq9w8e/'), 't1_kq9w8e');
});

void test('parseCommentRef rejects share short-links and post-only URLs', () => {
  assert.equal(parseCommentRef('https://www.reddit.com/r/castiron/s/AbCdEf1234'), null);
  assert.equal(parseCommentRef('https://www.reddit.com/r/castiron/comments/1x2y3z/is_my_pan_ruined/'), null);
  assert.equal(parseCommentRef('hello world'), null);
});

void test('sanitizeCommentBody removes users, subs, links and markdown', () => {
  assert.equal(
    sanitizeCommentBody('> quote\n**Bold** advice from u/someone_1 in r/castiron: see [this guide](https://x.com/a_(b)) or https://y.com/z'),
    'quote Bold advice from [user] in [sub]: see this guide or [link]'
  );
  assert.equal(sanitizeCommentBody('/u/Foo and /r/Bar &amp; more'), '[user] and [sub] & more');
});

void test('sanitizeCommentBody does not touch words that merely contain u/ or r/', () => {
  assert.equal(sanitizeCommentBody('km/r/ratio stays, so does 50u/hr'), 'km/r/ratio stays, so does 50u/hr');
});

void test('checkCaseBody enforces length, deletion and answer leaks', () => {
  const ok = 'Just keep cooking with it and the seasoning will build up over time, trust me.';
  assert.deepEqual(checkCaseBody(ok, 'castiron'), { ok: true });
  assert.deepEqual(checkCaseBody('[deleted]', 'castiron'), { ok: false, reason: 'deleted' });
  assert.deepEqual(checkCaseBody('too short', 'castiron'), { ok: false, reason: 'too-short' });
  assert.deepEqual(checkCaseBody('x'.repeat(401), 'castiron'), { ok: false, reason: 'too-long' });
  assert.deepEqual(checkCaseBody(`${ok} Welcome to CastIron!`, 'castiron'), { ok: false, reason: 'mentions-answer' });
});
