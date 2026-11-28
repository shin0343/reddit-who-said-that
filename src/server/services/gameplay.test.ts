import { publicQuestionId, toPublic } from '../games/who-said-that/cases.ts';
import { recordConsent } from './consent.ts';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import type { ContentEntry } from '../../shared/games/who-said-that/community.ts';
import type {
  DailyAction,
  QuestionRecord,
} from '../../shared/games/who-said-that/contracts.ts';
import {
  PARTY,
  roomChannel,
  type PartyAction,
  type PartySnapshot,
} from '../../shared/games/who-said-that/party.ts';
import seedCases from '../games/who-said-that/seed-cases.json' with { type: 'json' };
import { PARTY_QUESTIONS } from '../games/who-said-that/partyQuestions.ts';
import { SAMPLE_QUESTIONS } from '../games/who-said-that/sampleQuestions.ts';
import { playDaily, readDailyProgress } from './dailyPlay.ts';
import {
  createRoom,
  updateRoom,
  validRoomCode,
  type RoomIdentity,
} from './rooms.ts';
import {
  approveContent,
  availablePartyIds,
  contentStatus,
  readQuestion,
  withdrawContent,
} from './contentBank.ts';
import { getOrCreateDaily, getPracticeDaily, type Daily } from './daily.ts';
import { DAY_MS, dayOffset, todayKey } from './dateKey.ts';
import {
  communityResults,
  dailyBoard,
  dailyHistory,
  playerShard,
  playKey,
  streakFor,
} from './leaderboard.ts';
import { erasePlayer } from './privacy.ts';
import type { ReadManyStore } from './watched.ts';

function memoryStore() {
  const data = new Map<string, { value: string; expiresAt: number }>();
  const store: ReadManyStore = {
    async get(key) {
      return data.get(key)?.value;
    },
    async mGet(keys) {
      return keys.map((key) => data.get(key)?.value ?? null);
    },
    async watch(...keys) {
      const original = keys.map((key) => data.get(key));
      const queued = new Map<
        string,
        { value: string; expiresAt: number } | null
      >();
      return {
        async multi() {},
        async set(key, value, options) {
          queued.set(key, { value, expiresAt: options.expiration.getTime() });
        },
        async del(key) {
          queued.set(key, null);
        },
        async exec() {
          if (keys.some((key, i) => data.get(key) !== original[i])) return [];
          return Array.from(queued, ([key, value]) => {
            if (!value) return Number(data.delete(key));
            data.set(key, value);
            return 'OK';
          });
        },
        async unwatch() {},
        async discard() {
          queued.clear();
        },
      };
    },
  };
  return { store, data };
}

const account = (name: string): RoomIdentity => ({
  id: `private-id-${name}`,
  name,
});

function roomFixture() {
  const { store, data } = memoryStore();
  let time = 1_800_000_000_000;
  const clock = () => time;
  const host = account('Host');
  const guest = account('Guest');
  const create = (requestId = randomUUID()) =>
    createRoom(store, host, requestId, clock);
  const act = (
    code: string,
    identity: RoomIdentity,
    action: PartyAction | { type: 'join' }
  ) => updateRoom(store, code, identity, action, clock);
  const snap = async (
    code: string,
    identity: RoomIdentity,
    action: PartyAction | { type: 'join' } = { type: 'sync' }
  ) => {
    const result = await act(code, identity, action);
    assert.ok(result.state);
    return result.state;
  };
  const ready = (state: PartySnapshot, identity: RoomIdentity, value = true) =>
    snap(state.code, identity, {
      type: 'ready',
      ready: value,
      seat: state.mySeat,
      revision: state.myReadyRevision,
    });
  const start = async () => {
    const { code } = await create();
    await ready(await snap(code, guest, { type: 'join' }), guest);
    return snap(code, host, { type: 'start' });
  };
  return {
    host,
    guest,
    create,
    act,
    snap,
    ready,
    start,
    data,
    clock,
    move: (ms: number) => {
      time += ms;
    },
  };
}

function getQuestion(state: PartySnapshot) {
  assert.ok(state.question);
  const record = PARTY_QUESTIONS.find(
    (question) => question.id === state.question?.id
  );
  assert.ok(record);
  return record;
}

void test('party create is idempotent and rooms accept at most six unique authorized accounts', async () => {
  const { create, act, snap, host, guest, data } = roomFixture();
  const id = randomUUID();
  const [room, retry] = await Promise.all([create(id), create(id)]);
  assert.equal(retry.code, room.code);
  assert.ok(validRoomCode(room.code));
  assert.match(roomChannel(room.code), /^[a-zA-Z0-9_]+$/);
  const stored = data.get(`wst:room:${room.code}`);
  assert.equal(stored?.expiresAt, room.expiresAt);
  await assert.rejects(snap(room.code, guest), { status: 403 });
  await assert.rejects(snap('AAAAAAAAAAAA', guest, { type: 'join' }), {
    status: 404,
  });
  await assert.rejects(snap(room.code, host, { type: 'start' }), {
    status: 409,
  });

  const joins = await Promise.allSettled(
    Array.from({ length: 8 }, (_, index) =>
      act(room.code, account(`Player${index}`), { type: 'join' })
    )
  );
  assert.equal(
    joins.filter((result) => result.status === 'fulfilled').length,
    5
  );
  assert.equal(
    joins.filter((result) => result.status === 'rejected').length,
    3
  );
  for (const result of joins)
    if (result.status === 'rejected')
      assert.equal(result.reason.message, 'This room is full.');
  const member = await snap(room.code, account('Player0'), { type: 'join' });
  assert.equal(member.players.length, 6);
  assert.equal(new Set(member.players.map((player) => player.seat)).size, 6);
  await assert.rejects(snap(room.code, account('Player0'), { type: 'start' }), {
    status: 403,
  });
});

void test('lobby readiness ignores stale changes and a leaving host passes the room to the oldest seat', async () => {
  const { create, act, snap, ready, host, guest } = roomFixture();
  const room = await create();
  const initialGuest = await snap(room.code, guest, { type: 'join' });
  const readyGuest = await ready(initialGuest, guest);
  await ready(readyGuest, guest, false);
  const stale = await ready(initialGuest, guest);
  assert.equal(
    stale.players.find((player) => player.seat === stale.mySeat)?.ready,
    false
  );

  await act(room.code, host, { type: 'leave', seat: room.mySeat });
  const promoted = await snap(room.code, guest);
  assert.equal(promoted.hostSeat, promoted.mySeat);
  const rejoined = await snap(room.code, host, { type: 'join' });
  assert.notEqual(rejoined.mySeat, room.mySeat);
  await assert.rejects(
    act(room.code, host, { type: 'leave', seat: room.mySeat }),
    { status: 409 }
  );
  await ready(rejoined, host);
  const running = await snap(room.code, guest, { type: 'start' });
  assert.equal(running.status, 'ROUND_ACTIVE');
  await assert.rejects(snap(room.code, account('Late'), { type: 'join' }), {
    status: 409,
  });
  await act(room.code, guest, { type: 'leave', seat: promoted.mySeat });
  assert.equal((await snap(room.code, host)).status, 'CLOSED');
});

void test('active snapshots protect answers, hints and choices and restore the same seat on reconnect', async () => {
  const { create, snap, host, guest, start } = roomFixture();
  const room = await start();
  const { code } = room;
  const question = getQuestion(room);
  assert.deepEqual((await snap(code, guest)).question, room.question);
  const hint = await snap(code, host, {
    type: 'hint',
    round: 0,
    kind: 'thread-title',
  });
  assert.equal(hint.hints['thread-title'], question.threadTitle);
  assert.deepEqual((await snap(code, guest)).hints, {});
  const guess = await snap(code, host, {
    type: 'guess',
    round: 0,
    choice: question.answerSubreddit,
  });
  assert.equal(guess.myPick, question.answerSubreddit);
  assert.equal(
    guess.players.find((player) => player.seat === guess.mySeat)?.score,
    0
  );
  const peer = await snap(code, guest);
  assert.equal(peer.myPick, null);
  assert.equal(peer.reveal, null);
  assert.equal(
    peer.players.find((player) => player.seat === room.mySeat)?.answered,
    true
  );
  const wire = JSON.stringify(peer);
  for (const privateField of [
    'answerSubreddit',
    'threadTitle',
    'sourceRef',
    'questionIds',
    host.id,
    guest.id,
    question.threadTitle,
    question.explanation,
  ]) {
    assert.ok(!wire.includes(privateField), privateField);
  }
  const resumed = await snap(code, host, { type: 'join' });
  assert.equal(resumed.myPick, guess.myPick);
  assert.equal(resumed.mySeat, guess.mySeat);
  assert.equal(resumed.version, guess.version);

  const retry = await snap(code, host, {
    type: 'guess',
    round: 0,
    choice: question.choices.find((choice) => choice !== guess.myPick) ?? '',
  });
  assert.equal(retry.version, guess.version);
  assert.equal(retry.myPick, guess.myPick);
  const revealed = await snap(code, guest, {
    type: 'guess',
    round: 0,
    choice: question.answerSubreddit,
  });
  assert.equal(
    revealed.players.find((player) => player.seat === guess.mySeat)?.score,
    120
  );
  assert.equal(revealed.reveal?.points, 150);
  assert.notEqual((await create()).code, code);
});

void test('simultaneous guesses and retries settle each round once and both players reach identical final ranks', async () => {
  const { start, snap, move, host, guest } = roomFixture();
  let state = await start();
  const code = state.code;
  const seen = new Set<string>();
  for (let round = 0; round < PARTY.rounds; round++) {
    const question = getQuestion(state);
    seen.add(question.id);
    const wrong =
      question.choices.find((choice) => choice !== question.answerSubreddit) ??
      '';
    await Promise.all([
      snap(code, host, {
        type: 'guess',
        round,
        choice: question.answerSubreddit,
      }),
      snap(code, guest, { type: 'guess', round, choice: wrong }),
      snap(code, host, {
        type: 'guess',
        round,
        choice: question.answerSubreddit,
      }),
    ]);
    state = await snap(code, host);
    const peer = await snap(code, guest);
    assert.deepEqual(state.players, peer.players);
    assert.equal(state.status, 'ROUND_REVEAL');
    assert.equal(state.reveal?.points, 150);
    assert.equal(state.reveal?.counts[question.answerSubreddit], 1);
    assert.equal(state.reveal?.distribution[wrong], 0.5);
    assert.deepEqual(state.reveal?.popularWrong, [wrong]);
    assert.equal(peer.reveal?.pick, wrong);
    assert.equal(state.players[0]?.score, (round + 1) * 150);
    const version = state.version;
    move(PARTY.revealMs);
    await Promise.all([snap(code, host), snap(code, guest), snap(code, host)]);
    state = await snap(code, host);
    assert.equal(state.version, version + 1);
    const stale = await snap(code, guest, {
      type: 'guess',
      round,
      choice: wrong,
    });
    assert.equal(stale.version, state.version);
  }
  assert.equal(seen.size, PARTY.rounds);
  assert.equal(state.status, 'FINISHED');
  assert.deepEqual(state.players, (await snap(code, guest)).players);
  assert.deepEqual(
    state.players.map(({ rank, score }) => ({ rank, score })),
    [
      { rank: 1, score: 750 },
      { rank: 2, score: 0 },
    ]
  );
});

void test('deadline rejects late guesses and concurrent timeout syncs do not re-award points', async () => {
  const { start, snap, move, host, guest } = roomFixture();
  const state = await start();
  const { code } = state;
  const { answerSubreddit } = getQuestion(state);
  move(PARTY.roundMs - 1);
  const locked = await snap(code, host, {
    type: 'guess',
    round: 0,
    choice: answerSubreddit,
  });
  move(1);
  const [late, synced] = await Promise.all([
    snap(code, guest, { type: 'guess', round: 0, choice: answerSubreddit }),
    snap(code, host),
  ]);
  assert.equal(late.version, locked.version + 1);
  assert.equal(synced.version, late.version);
  assert.equal(late.reveal?.pick, null);
  assert.equal(late.reveal?.missed, 1);
  assert.equal(late.reveal?.counts[answerSubreddit], 1);
  assert.equal(synced.players[0]?.score, 100);
  move(PARTY.roomTtlMs);
  await assert.rejects(snap(code, host), { status: 410 });
});

void test('party content has a distinct pool and all authored questions have four choices', () => {
  const dailyIds = new Set(
    [...seedCases, ...SAMPLE_QUESTIONS].map((question) => question.id)
  );
  const dailyBodies = new Set(
    SAMPLE_QUESTIONS.map((question) => question.body)
  );
  assert.ok(PARTY_QUESTIONS.length >= 25);
  for (const question of PARTY_QUESTIONS) {
    assert.ok(!dailyIds.has(question.id) && !dailyBodies.has(question.body));
    assert.equal(question.source, 'fictional');
    assert.equal(new Set(question.choices).size, 4);
    assert.ok(question.choices.includes(question.answerSubreddit));
  }
});

const testDay = '2026-11-27';
const dayStart = Date.parse(testDay);

async function addApproved(
  store: ReadManyStore,
  count: number,
  pool: 'daily' | 'party' = 'daily',
  approvedAt = dayStart
) {
  for (let i = 0; i < count; i++) {
    const sample = SAMPLE_QUESTIONS[i % SAMPLE_QUESTIONS.length]!;
    const commentId: `t1_${string}` = `t1_${pool}${i}`;
    const entry: ContentEntry = {
      id: `reddit-${commentId}`,
      commentId,
      postId: `t3_${pool}`,
      pool,
      difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
      status: 'approved',
      checkedAt: approvedAt,
      permission: {
        kind: 'documented',
        reference: 'fixture-receipt',
        at: approvedAt,
      },
    };
    const question: QuestionRecord = {
      ...sample,
      id: entry.id,
      source: 'reddit',
      sourceRef: {
        kind: 'reddit',
        commentId,
        permalink: 'https://www.reddit.com/',
      },
    };
    await approveContent(store, entry, question, approvedAt);
  }
}

async function finish(
  store: ReadManyStore,
  daily: Daily,
  uid: string,
  clock: () => number,
  correctCount = 5
) {
  const act = (action: DailyAction) =>
    playDaily(store, uid, daily, action, clock);
  let state = await act({ type: 'open' });
  for (const [i, q] of daily.questions.entries()) {
    if (!q) continue;
    assert.equal(state.question?.id, publicQuestionId(q));
    const guess: DailyAction = {
      type: 'guess',
      dateKey: daily.dateKey,
      questionId: publicQuestionId(q),
      choice:
        i < correctCount
          ? q.answerSubreddit
          : q.choices.find((c) => c !== q.answerSubreddit)!,
    };
    const [first, retry] = await Promise.all([act(guess), act(guess)]);
    assert.deepEqual(first.reveal, retry.reveal);
    assert.ok(first.reveal && !('distribution' in first.reveal));
    assert.equal(first.community, null);
    const next: DailyAction = {
      type: 'next',
      dateKey: daily.dateKey,
      questionId: publicQuestionId(q),
    };
    [state] = await Promise.all([act(next), act(next)]);
  }
  assert.equal(state.finished, true);
  return state;
}

void test('UTC boundary, concurrent pack creation, scheduler repeat and lazy rollover share the same frozen pack', async () => {
  const { store } = memoryStore();
  assert.equal(todayKey(new Date(dayStart - 1)), '2026-11-26');
  assert.equal(todayKey(new Date(dayStart)), testDay);
  await addApproved(store, 10);
  const versions = await Promise.all(
    Array.from({ length: 6 }, () => getOrCreateDaily(store, testDay, dayStart))
  );
  const first = versions[0]!;
  assert.equal(first.pack.version, 1);
  assert.equal(first.pack.mode, 'official');
  assert.equal(new Set(first.qids).size, 5);
  for (const pack of versions) assert.deepEqual(pack, first);
  await addApproved(store, 5, 'party');
  assert.deepEqual(await getOrCreateDaily(store, testDay, dayStart + 1), first);
  const tomorrow = await getOrCreateDaily(
    store,
    dayOffset(testDay, 1),
    dayStart + DAY_MS
  );
  assert.notEqual(tomorrow.pack.id, first.pack.id);
  assert.equal(
    tomorrow.qids.some((id) => first.qids.includes(id)),
    false
  );
  const party = await availablePartyIds(store, 'room', dayStart);
  assert.equal(party.length, 5);
  assert.equal(
    party.some((id) => first.qids.includes(id) || tomorrow.qids.includes(id)),
    false
  );
  assert.equal((await contentStatus(store, dayStart)).distinctDailyPacks, 2);
});

void test('withdrawal deletes the snapshot, retains pack order and makes the day unranked for everyone', async () => {
  const { store } = memoryStore();
  await addApproved(store, 6);
  const original = await getOrCreateDaily(store, testDay, dayStart);
  const clock = () => dayStart + 30_000;
  const before = await playDaily(
    store,
    'unfinished',
    original,
    { type: 'open' },
    clock
  );
  await finish(store, original, 'finished', clock);
  assert.ok(await communityResults(store, original, 'finished'));
  const removed = original.questions[0]!;
  assert.equal(await withdrawContent(store, removed.id, 'Deleted', clock()), 1);
  assert.equal(await withdrawContent(store, removed.id, 'Deleted', clock()), 0);
  assert.equal(await readQuestion(store, removed.id), null);
  const updated = await getOrCreateDaily(store, testDay, clock());
  assert.deepEqual(updated.qids, original.qids);
  assert.equal(updated.pack.mode, 'practice');
  assert.equal(updated.pack.withdrawn, true);
  assert.equal(updated.questions[0], null);
  assert.equal(await communityResults(store, updated, 'finished'), null);
  assert.equal(await communityResults(store, original, 'finished'), null);
  await assert.rejects(
    playDaily(store, 'unfinished', original, { type: 'open' }, clock),
    { status: 409 }
  );
  const resumed = await playDaily(
    store,
    'unfinished',
    updated,
    { type: 'open' },
    clock
  );
  assert.equal(before.round, 0);
  assert.equal(resumed.round, 1);
  assert.equal(resumed.outcomes[0], null);
});

void test('fictional Daily stays frozen after approval and tutorial uses independent unranked progress', async () => {
  const { store } = memoryStore();
  const clock = () => dayStart;
  const fiction = await getOrCreateDaily(store, testDay, dayStart);
  assert.equal(fiction.pack.mode, 'fictional');
  assert.ok(fiction.questions.every((q) => q?.source === 'fictional'));
  const issued = await playDaily(
    store,
    'tester',
    fiction,
    { type: 'open' },
    clock
  );
  await addApproved(store, 5);
  assert.deepEqual(await getOrCreateDaily(store, testDay, dayStart), fiction);
  assert.deepEqual(
    (await playDaily(store, 'tester', fiction, { type: 'open' }, clock))
      .question,
    issued.question
  );
  const practice = getPracticeDaily(testDay);
  assert.equal(practice.pack.mode, 'practice');
  assert.ok(practice.qids.every((id) => !fiction.qids.includes(id)));
  await finish(store, practice, 'tester', clock);
  assert.equal(await store.get(playerShard(testDay, 'tester')), undefined);
  assert.equal(
    await store.get(playerShard(testDay, 'tester', 'fictional')),
    undefined
  );
  await finish(store, fiction, 'tester', clock);
  assert.equal(
    (await communityResults(store, fiction, 'tester'))?.streak.current,
    1
  );
  assert.ok(await store.get(playerShard(testDay, 'tester', 'fictional')));
  const tomorrow = await getOrCreateDaily(
    store,
    dayOffset(testDay, 1),
    dayStart + DAY_MS
  );
  assert.equal(tomorrow.pack.mode, 'official');
  await finish(store, tomorrow, 'tester', () => dayStart + DAY_MS);
  const result = await communityResults(store, tomorrow, 'tester');
  assert.equal(result?.streak.current, 1);
  assert.equal(result?.participants, 1);
  assert.equal(
    await store.get(playerShard(tomorrow.dateKey, 'tester', 'fictional')),
    undefined
  );
  assert.equal(await store.get(playerShard(testDay, 'tester')), undefined);
  await assert.rejects(
    playDaily(
      store,
      'tester',
      fiction,
      { type: 'open' },
      () => dayStart + DAY_MS
    ),
    { status: 409 }
  );
});

void test('14 stored fictional Daily packs cover 70 cases and preserve all dates regardless of request order', async () => {
  const { store } = memoryStore();
  const days = Array.from({ length: 14 }, (_, i) => dayOffset(testDay, i));
  const packs = [];
  for (const day of days.toReversed()) {
    packs.push(await getOrCreateDaily(store, day, Date.parse(day)));
  }
  assert.equal(new Set(packs.flatMap((pack) => pack.qids)).size, 70);
  for (const pack of packs)
    assert.deepEqual(
      await getOrCreateDaily(store, pack.dateKey, Date.parse(pack.dateKey)),
      pack
    );
});

void test('fictional rooms rotate through all 25 Party cases and an in-progress room survives a pool change', async () => {
  const { store, data } = memoryStore();
  const host = account('host');
  const guest = account('guest');
  const clock = () => dayStart;
  const rooms = [];
  for (let i = 0; i < 5; i++)
    rooms.push(await createRoom(store, host, randomUUID(), clock));
  const packs = rooms.map(
    ({ code }) => JSON.parse(data.get(`wst:room:${code}`)!.value).questionIds
  );
  assert.equal(new Set(packs.flat()).size, 25);
  const { code } = rooms[0]!;
  const { state: joined } = await updateRoom(
    store,
    code,
    guest,
    { type: 'join' },
    clock
  );
  assert.ok(joined);
  await updateRoom(
    store,
    code,
    guest,
    {
      type: 'ready',
      ready: true,
      seat: joined.mySeat,
      revision: joined.myReadyRevision,
    },
    clock
  );
  const { state: active } = await updateRoom(
    store,
    code,
    host,
    { type: 'start' },
    clock
  );
  assert.equal(active?.content, 'fictional');
  assert.ok(
    active?.question &&
      !('answerSubreddit' in active.question) &&
      !('cultureHint' in active.question)
  );
  await addApproved(store, 5, 'party');
  assert.equal(
    (await createRoom(store, host, randomUUID(), clock)).content,
    'reddit'
  );
  assert.deepEqual(
    (await updateRoom(store, code, guest, { type: 'sync' }, clock)).state
      ?.question,
    active.question
  );
});

void test('author opt-in must still be active at approval and public questions omit the real source ID', async () => {
  const { store } = memoryStore();
  const commentId = 't1_realcomment';
  const entry: ContentEntry = {
    id: 'reddit-t1_realcomment-opaque',
    commentId,
    postId: 't3_realpost',
    pool: 'daily',
    difficulty: 'medium',
    status: 'approved',
    checkedAt: dayStart,
    permission: { kind: 'author-opt-in', at: dayStart },
  };
  const record: QuestionRecord = {
    ...SAMPLE_QUESTIONS[0]!,
    id: entry.id,
    source: 'reddit',
    sourceRef: {
      kind: 'reddit',
      commentId,
      permalink:
        'https://www.reddit.com/r/example/comments/realpost/title/realcomment/',
    },
  };
  const { permission, ...withoutEvidence } = entry;
  await assert.rejects(
    approveContent(store, withoutEvidence, record, dayStart),
    { message: 'Author permission evidence is missing.' }
  );
  await assert.rejects(approveContent(store, entry, record, dayStart), {
    status: 409,
  });
  await recordConsent(store, commentId, 'active', dayStart);
  await approveContent(store, entry, record, dayStart);
  const publicCase = JSON.stringify(toPublic(record));
  assert.ok(
    !publicCase.includes('realcomment') &&
      !publicCase.includes('answerSubreddit')
  );
  await recordConsent(store, commentId, 'withdrawn', dayStart + 1);
  await withdrawContent(
    store,
    commentId,
    'Author withdrew permission',
    dayStart + 1
  );
  assert.equal(await readQuestion(store, entry.id), null);
  await assert.rejects(
    approveContent(store, { ...entry, id: 'new' }, record, dayStart + 2),
    { status: 409 }
  );
});
void test('official completion publishes once, ranks score and then finish time, and guards community results', async () => {
  const { store } = memoryStore();
  await addApproved(store, 5);
  const daily = await getOrCreateDaily(store, testDay, dayStart);
  await finish(store, daily, 'A', () => dayStart + 100, 5);
  const small = await communityResults(store, daily, 'A');
  assert.equal(small?.participants, 1);
  assert.equal(small?.percentile, null);
  assert.deepEqual(small?.cases, []);
  await finish(store, daily, 'B', () => dayStart + 200, 5);
  await finish(store, daily, 'C', () => dayStart + 200, 5);
  await finish(store, daily, 'D', () => dayStart + 300, 2);
  await finish(store, daily, 'E', () => dayStart + 350, 1);
  assert.equal(await communityResults(store, daily, 'unplayed'), null);
  assert.deepEqual(await readDailyProgress(store, testDay, 'unplayed'), {
    progress: 'new',
    round: 0,
  });
  assert.equal(await store.get(playKey(testDay, 'unplayed')), undefined);
  assert.deepEqual(await readDailyProgress(store, testDay, 'A'), {
    progress: 'finished',
    round: 5,
  });
  const board = await dailyBoard(store, daily, 'unplayed');
  assert.deepEqual(Object.keys(board).sort(), [
    'dateKey',
    'mode',
    'participants',
    'personalRank',
    'top',
  ]);
  assert.equal(board.personalRank, null);
  assert.deepEqual(
    board.top.map((row) => row.rank),
    [1, 2, 2, 4, 5]
  );
  assert.equal(
    (await dailyHistory(store, testDay, 'A', 'fictional')).streak.current,
    0
  );
  const community = await communityResults(store, daily, 'A');
  assert.ok(community);
  assert.equal(community.participants, 5);
  assert.equal(community.personalRank, 1);
  assert.equal(community.percentile, 50);
  assert.deepEqual(
    community.top.map((row) => row.rank),
    [1, 2, 2, 4, 5]
  );
  assert.deepEqual(community.hardest, [3, 4, 5]);
  assert.equal(community.cases[1]?.correctRate, 0.8);
  assert.equal(community.cases[4]?.correctRate, 0.6);
  assert.equal(community.cases[4]?.popularWrong.length, 1);
  assert.match(community.shareText, /5\/5 Cases Solved/);
  assert.ok(!community.shareText.includes('r/'));
  assert.equal(community.streak.current, 1);
  assert.equal(community.bestScore, 750);
});

void test('Daily hints resume, remain private and affect the authoritative score once', async () => {
  const { store } = memoryStore();
  await addApproved(store, 5);
  const daily = await getOrCreateDaily(store, testDay, dayStart);
  const q = daily.questions[0]!;
  const act = (action: DailyAction) =>
    playDaily(store, 'A', daily, action, () => dayStart);
  const opened = await act({ type: 'open' });
  assert.ok(!JSON.stringify(opened).includes('answerSubreddit'));
  const request: DailyAction = {
    type: 'hint',
    kind: 'eliminate-one',
    dateKey: testDay,
    questionId: publicQuestionId(q),
  };
  await Promise.all([act(request), act(request)]);
  assert.ok((await act({ type: 'open' })).hints['eliminate-one']);
  const reveal = await act({
    type: 'guess',
    choice: q.answerSubreddit,
    dateKey: testDay,
    questionId: publicQuestionId(q),
  });
  assert.equal(reveal.reveal?.points, 120);
  assert.deepEqual(reveal.reveal?.hintsUsed, ['eliminate-one']);
  assert.deepEqual((await act({ type: 'open' })).reveal, reveal.reveal);
  assert.equal(reveal.community, null);
});

void test('streak accounts for date gaps and yesterday grace while retaining the longest run', () => {
  const days = ['2026-11-23', '2026-11-24', '2026-11-24', '2026-11-26'];
  assert.deepEqual(streakFor(days, '2026-11-27'), {
    current: 1,
    longest: 2,
    last: '2026-11-26',
  });
  assert.deepEqual(streakFor(days, '2026-11-28'), {
    current: 0,
    longest: 2,
    last: '2026-11-26',
  });
});

void test('approved Party content remains isolated and an invalidated active source closes the room', async () => {
  const { store } = memoryStore();
  await addApproved(store, 5, 'party');
  const clock = () => dayStart;
  const host = account('host');
  const guest = account('guest');
  const { code } = await createRoom(store, host, randomUUID(), clock);
  const { state: joined } = await updateRoom(
    store,
    code,
    guest,
    { type: 'join' },
    clock
  );
  assert.ok(joined);
  await updateRoom(
    store,
    code,
    guest,
    {
      type: 'ready',
      ready: true,
      seat: joined.mySeat,
      revision: joined.myReadyRevision,
    },
    clock
  );
  const { state: active } = await updateRoom(
    store,
    code,
    host,
    { type: 'start' },
    clock
  );
  assert.equal(active?.question?.source, 'reddit');
  const removed = (await contentStatus(store, dayStart)).entries.find(
    ({ id }) =>
      toPublic({ ...SAMPLE_QUESTIONS[0]!, source: 'reddit', id }).id ===
      active?.question?.id
  );
  assert.ok(removed);
  await withdrawContent(store, removed.id, 'Removed', dayStart);
  const { state: closed } = await updateRoom(
    store,
    code,
    guest,
    { type: 'sync' },
    clock
  );
  assert.equal(closed?.status, 'CLOSED');
  assert.equal(closed?.closeReason, 'content');
  assert.equal(closed?.question, null);
});

void test('account data deletion removes play, leaderboard, membership and host identity for a deletion request', async () => {
  const { store, data } = memoryStore();
  const now = Date.now();
  const day = todayKey(new Date(now));
  await addApproved(store, 5, 'daily', now);
  const daily = await getOrCreateDaily(store, day, now);
  const uid = 't2_deleted';
  await finish(store, daily, uid, () => now);
  const host = { id: uid, name: 'private-name' };
  const other = account('remaining');
  const room = await createRoom(store, host, randomUUID());
  await updateRoom(store, room.code, other, { type: 'join' });
  await erasePlayer(store, uid, day);
  assert.equal(await store.get(playKey(day, uid)), undefined);
  assert.equal(await store.get(playerShard(day, uid)), undefined);
  assert.ok(!JSON.stringify([...data]).includes(uid));
  assert.ok(!JSON.stringify([...data]).includes(host.name));
  const resumed = await updateRoom(store, room.code, other, { type: 'sync' });
  assert.equal(resumed.state?.hostSeat, resumed.state?.mySeat);
});

void test('an account can retry a room creation at its capacity and create again after expiry', async () => {
  const { store } = memoryStore();
  const host = account('Host');
  let now = 1_800_000_000_000;
  const clock = () => now;
  const firstRequest = randomUUID();
  const first = await createRoom(store, host, firstRequest, clock);
  for (let i = 1; i < 24; i++) {
    await createRoom(store, host, randomUUID(), clock);
  }
  await assert.rejects(createRoom(store, host, randomUUID(), clock), {
    status: 429,
  });
  const retried = await createRoom(store, host, firstRequest, clock);
  assert.equal(retried.code, first.code);
  now += PARTY.roomTtlMs + 1;
  const next = await createRoom(store, host, randomUUID(), clock);
  assert.ok(next.expiresAt > now);
});
