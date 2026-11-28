import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import dailyJson from './daily.json' with { type: 'json' };
import partyJson from './party.json' with { type: 'json' };
import tutorialJson from './tutorial.json' with { type: 'json' };
import { FICTIONAL, fictionalDailyIds, fictionalPartyIds } from './index.ts';
import { toPublic } from '../../games/who-said-that/cases.ts';
import { availableHints } from '../../games/who-said-that/round.ts';
import { checkCaseBody } from '../../providers/redditText.ts';
import { dayOffset } from '../../services/dateKey.ts';

void test('100 playable original questions have unique IDs and bodies, distinct pools, valid clues and no Reddit provenance', () => {
  assert.ok(dailyJson.length >= 70 && dailyJson.length % 5 === 0);
  assert.ok(partyJson.length >= 25 && partyJson.length % 5 === 0);
  assert.equal(tutorialJson.length, 5);
  const records = Object.values(FICTIONAL).flat();
  const raw = [...dailyJson, ...partyJson, ...tutorialJson];
  const allowed = [
    'id',
    'body',
    'choices',
    'answerSubreddit',
    'threadTitle',
    'cultureHint',
    'explanation',
    'difficulty',
    'source',
    'pool',
  ];
  const uniqueIds = new Set<string>();
  const uniqueBodies = new Set<string>();
  for (const [index, question] of records.entries()) {
    const {
      id,
      body,
      choices,
      answerSubreddit,
      threadTitle,
      cultureHint,
      explanation,
      pool,
    } = question;
    assert.deepEqual(Object.keys(raw[index]!).sort(), [...allowed].sort(), id);
    assert.match(id, new RegExp(`^fictional-${pool}-[0-9]{3,}$`));
    assert.ok(!uniqueIds.has(id), id);
    uniqueIds.add(id);
    const normalized = body
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, ' ')
      .trim();
    assert.ok(!uniqueBodies.has(normalized), id);
    uniqueBodies.add(normalized);
    assert.deepEqual(checkCaseBody(body, answerSubreddit), { ok: true }, id);
    assert.equal(
      new Set(choices.map((choice) => choice.toLowerCase())).size,
      4,
      id
    );
    assert.equal(choices.length, 4, id);
    assert.ok(choices.includes(answerSubreddit), id);
    for (const name of choices) assert.match(name, /^[a-z0-9_]{2,21}$/i, id);
    for (const clue of [threadTitle, cultureHint, explanation])
      assert.ok(clue.trim().length >= 10, id);
    assert.deepEqual(availableHints(question), ['thread-title', 'culture'], id);
    assert.deepEqual(question.sourceRef, { kind: 'fictional' }, id);
    assert.doesNotMatch(body, /reddit\.com|\b[ur]\//i, id);
    assert.deepEqual(
      Object.keys(toPublic(question)).sort(),
      ['body', 'choices', 'id', 'source'],
      id
    );
  }
  const communities = new Set(
    records.map((question) => question.answerSubreddit.toLowerCase())
  );
  assert.ok(communities.size >= 30);
  const ratio = (level: string) =>
    records.filter((question) => question.difficulty === level).length /
    records.length;
  for (const [level, target] of Object.entries({
    easy: 0.3,
    medium: 0.5,
    hard: 0.2,
  })) {
    assert.ok(Math.abs(ratio(level) - target) <= 0.05, level);
  }
});

void test('Daily and Party use all available groups before wrapping, including across the epoch', () => {
  const base = '2026-11-23';
  const size = FICTIONAL.daily.length / 5;
  const days = Array.from({ length: size }, (_, index) =>
    fictionalDailyIds(dayOffset(base, index))
  );
  assert.equal(new Set(days.flat()).size, FICTIONAL.daily.length);
  assert.deepEqual(fictionalDailyIds(dayOffset(base, size)), days[0]);
  const rooms = Array.from({ length: FICTIONAL.party.length / 5 }, (_, index) =>
    fictionalPartyIds(index, 'room')
  );
  assert.equal(new Set(rooms.flat()).size, FICTIONAL.party.length);
  assert.ok(rooms.flat().every((id) => !days.flat().includes(id)));
});

void test('submission and judging dates cover ten disjoint packs across the UTC rollover', () => {
  const firstDay = '2026-12-08';
  const packs = Array.from({ length: 10 }, (_, i) =>
    fictionalDailyIds(dayOffset(firstDay, i))
  );
  assert.ok(packs.every((pack) => pack.length === 5));
  assert.equal(new Set(packs.flat()).size, 50);
  assert.deepEqual(
    packs[1],
    FICTIONAL.daily.slice(60, 65).map((question) => question.id)
  );
  assert.deepEqual(fictionalDailyIds('2026-12-11'), fictionalDailyIds('2026-11-27'));
});

void test('the built browser bundles do not contain authored questions, hints or answer metadata', () => {
  const build = new URL('../../../../dist/client/', import.meta.url);
  if (!existsSync(build)) return;
  const bundle = readdirSync(build)
    .filter((file) => /\.js(\.map)?$/.test(file))
    .map((file) => readFileSync(new URL(file, build), 'utf8'))
    .join('\n');
  assert.ok(bundle.length > 0);
  assert.doesNotMatch(bundle, /WST_DEMO_MODERATOR|x-demo-player|t2_demo_|wstDemo/);
  for (const question of Object.values(FICTIONAL).flat()) {
    for (const text of [
      question.body,
      question.threadTitle,
      question.cultureHint,
      question.explanation,
    ]) {
      assert.ok(!bundle.includes(text.slice(0, 35)), question.id);
    }
    assert.ok(!bundle.includes(question.id), question.id);
  }
});
