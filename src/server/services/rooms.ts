import { randomBytes, randomUUID } from 'node:crypto';
import {
  WST,
  type HintKind,
  type QuestionRecord,
} from '../../shared/games/who-said-that/contracts.ts';
import {
  PARTY,
  type HintValues,
  type PartyAction,
  type PartySnapshot,
  type PartyStatus,
} from '../../shared/games/who-said-that/party.ts';
import { DAY_MS } from './dateKey.ts';
import {
  publicQuestionId,
  seededShuffle,
  toPublic,
} from '../games/who-said-that/cases.ts';
import {
  partyQuestion,
  partyQuestionIds,
} from '../games/who-said-that/partyQuestions.ts';
import {
  availableHint,
  availableHints,
  resolveRound,
  voteDistribution,
} from '../games/who-said-that/round.ts';
import { availablePartyIds, readQuestion, snapshotKey } from './contentBank.ts';
import {
  deleteWrite,
  readJson,
  GameError,
  type GameStore,
  jsonWrite,
  withWatchedKeys,
} from './watched.ts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const validRoomCode = (code: string) =>
  code.length === PARTY.codeLength &&
  [...code].every((char) => ALPHABET.includes(char));

const newCode = () =>
  Array.from(randomBytes(PARTY.codeLength), (byte) => ALPHABET[byte & 31]).join(
    ''
  );
const MAX_UNEXPIRED_ROOMS_PER_ACCOUNT = 24;
const PARTY_ROTATION = 'wst:party:fictional-rotation';
const roomKey = (code: string) => `wst:room:${code}`;
const indexKey = (id: string) => `wst:room-membership:${id}`;
type RoomIndex = Record<string, { expiresAt: number; requestKey?: string }>;

async function indexRoom(
  store: GameStore,
  id: string,
  room: Room,
  now: number,
  requestKey?: string
) {
  const index = (await readJson<RoomIndex>(store, indexKey(id))) ?? {};
  const active = Object.fromEntries(
    Object.entries(index).filter(([, item]) => item.expiresAt > now)
  );
  if (
    !active[room.code] &&
    Object.keys(active).length >= MAX_UNEXPIRED_ROOMS_PER_ACCOUNT
  ) {
    throw new GameError('Too many recent Party Rooms. Try again later.', 429);
  }
  const creationRequest = requestKey ?? active[room.code]?.requestKey;
  active[room.code] = {
    expiresAt: room.expiresAt,
    ...(creationRequest && { requestKey: creationRequest }),
  };
  return jsonWrite(indexKey(id), active, now + PARTY.roomTtlMs);
}

export type RoomIdentity = { id: string; name: string };

type Player = RoomIdentity & {
  seat: number;
  ready: boolean;
  readyRevision: number;
  left: boolean;
  score: number;
  hints: HintKind[];
  guess: { choice: string; points: number } | null;
};

type Room = {
  roomId: string;
  code: string;
  hostId: string;
  players: Player[];
  status: PartyStatus;
  currentRound: number;
  questionIds: string[];
  roundStartedAt: number;
  roundEndsAt: number;
  revealEndsAt: number;
  revealMissed: number;
  version: number;
  createdAt: number;
  expiresAt: number;
  nextSeat: number;
  closeReason?: 'content';
};

const newPlayer = (
  identity: RoomIdentity,
  seat: number,
  ready = false
): Player => ({
  ...identity,
  seat,
  ready,
  readyRevision: 0,
  left: false,
  score: 0,
  hints: [],
  guess: null,
});

const readRoom = async (
  store: GameStore,
  code: string
): Promise<Room | null> => {
  const raw = await store.get(roomKey(code));
  return raw ? JSON.parse(raw) : null;
};

async function currentQuestion(store: GameStore, room: Room) {
  if (room.status !== 'ROUND_ACTIVE' && room.status !== 'ROUND_REVEAL')
    return undefined;
  const id = room.questionIds[room.currentRound];
  if (!id) return undefined;
  const sample = partyQuestion(id, room.roomId);
  if (sample) return sample;
  const record = await readQuestion(store, id);
  return record
    ? {
        ...record,
        choices: seededShuffle(record.choices, `${room.roomId}:${id}`),
      }
    : undefined;
}
const activePlayers = (room: Room) =>
  room.players.filter((player) => !player.left);
const findPlayer = (room: Room, id: string) =>
  room.players.find((player) => player.id === id);

function startRound(room: Room, now: number) {
  room.status = 'ROUND_ACTIVE';
  room.roundStartedAt = now;
  room.roundEndsAt = now + PARTY.roundMs;
  for (const player of room.players) {
    player.guess = null;
    player.hints = [];
  }
}

function revealRound(room: Room, now: number) {
  room.status = 'ROUND_REVEAL';
  room.revealEndsAt = now + PARTY.revealMs;
  room.revealMissed = activePlayers(room).filter(
    (player) => !player.guess
  ).length;
  for (const player of room.players) player.score += player.guess?.points ?? 0;
}

function advanceDue(room: Room, now: number) {
  if (room.status === 'ROUND_ACTIVE' && now >= room.roundEndsAt) {
    revealRound(room, now);
    return true;
  }
  if (room.status === 'ROUND_REVEAL' && now >= room.revealEndsAt) {
    if (room.currentRound + 1 === room.questionIds.length)
      room.status = 'FINISHED';
    else {
      room.currentRound++;
      startRound(room, now);
    }
    return true;
  }
  return false;
}

function applyAction(
  room: Room,
  player: Player,
  action: PartyAction,
  now: number,
  question?: QuestionRecord
): boolean {
  switch (action.type) {
    case 'sync':
      return false;
    case 'ready':
      if (
        room.status !== 'LOBBY' ||
        player.id === room.hostId ||
        player.ready === action.ready ||
        player.readyRevision !== action.revision
      )
        return false;
      player.ready = action.ready;
      player.readyRevision++;
      return true;
    case 'start':
      if (room.status !== 'LOBBY') return false;
      if (room.hostId !== player.id)
        throw new GameError('Only the host can start.', 403);
      if (
        room.players.length < WST.partyMinPlayers ||
        room.players.some((p) => !p.ready)
      ) {
        throw new GameError('At least two players must be ready.');
      }
      startRound(room, now);
      return true;
    case 'leave': {
      if (room.status === 'LOBBY')
        room.players = room.players.filter((p) => p !== player);
      else player.left = true;
      const remaining = activePlayers(room);
      if (player.id === room.hostId && remaining[0]) {
        room.hostId = remaining[0].id;
        remaining[0].ready = true;
      }
      if (room.status === 'LOBBY' && remaining.length === 0)
        room.status = 'CLOSED';
      if (room.status === 'ROUND_ACTIVE' || room.status === 'ROUND_REVEAL') {
        if (remaining.length < WST.partyMinPlayers) room.status = 'CLOSED';
        else if (
          room.status === 'ROUND_ACTIVE' &&
          remaining.every((p) => p.guess)
        )
          revealRound(room, now);
      }
      return true;
    }
    case 'hint':
    case 'guess': {
      // Stale/retried submissions return the authoritative phase without modifying it.
      if (
        room.status !== 'ROUND_ACTIVE' ||
        action.round !== room.currentRound ||
        player.guess
      )
        return false;
      if (!question) throw new GameError('The case is unavailable.', 503);
      if (action.type === 'hint') {
        if (player.hints.includes(action.kind)) return false;
        if (!availableHint(question, action.kind))
          throw new GameError('This hint is unavailable.', 400);
        player.hints.push(action.kind);
      } else {
        if (!question.choices.includes(action.choice))
          throw new GameError('Invalid choice.', 400);
        player.guess = {
          choice: action.choice,
          points: resolveRound(
            question,
            action.choice,
            player.hints,
            now - room.roundStartedAt
          ).points,
        };
        if (activePlayers(room).every((p) => p.guess)) revealRound(room, now);
      }
      return true;
    }
  }
}

function snapshot(
  room: Room,
  player: Player,
  now: number,
  question?: QuestionRecord
): PartySnapshot {
  const active = room.status === 'ROUND_ACTIVE';
  const revealed = room.status === 'ROUND_REVEAL';
  const hints: HintValues = {};
  let reveal: PartySnapshot['reveal'] = null;
  if (question && active) {
    for (const kind of player.hints)
      hints[kind] = availableHint(question, kind);
  }
  if (question && revealed) {
    const counts = Object.fromEntries(
      question.choices.map((choice) => [
        choice,
        room.players.filter((p) => p.guess?.choice === choice).length,
      ])
    );
    const wrongChoices = question.choices.filter(
      (choice) => choice !== question.answerSubreddit
    );
    const topWrong = Math.max(
      ...wrongChoices.map((choice) => counts[choice] ?? 0)
    );
    const pick = player.guess?.choice ?? null;
    reveal = {
      questionId: publicQuestionId(question),
      answerSubreddit: question.answerSubreddit,
      explanation: question.explanation,
      points: player.guess?.points ?? 0,
      correct: pick === question.answerSubreddit,
      distribution: voteDistribution(question.choices, counts),
      counts,
      responses: room.players.filter((p) => p.guess).length,
      missed: room.revealMissed,
      popularWrong: wrongChoices.filter(
        (choice) => topWrong > 0 && counts[choice] === topWrong
      ),
      pick,
      hintsUsed: player.hints,
      ...(question.sourceRef.kind === 'reddit' && {
        permalink: question.sourceRef.permalink,
      }),
    };
  }
  const sorted = [...room.players].sort(
    (a, b) => b.score - a.score || a.seat - b.seat
  );
  const priorScore = (p: Player) => p.score - (p.guess?.points ?? 0);
  return {
    code: room.code,
    content: room.questionIds[0]?.startsWith('reddit-')
      ? 'reddit'
      : 'fictional',
    status: room.status,
    closeReason: room.closeReason ?? null,
    expiresAt: room.expiresAt,
    version: room.version,
    serverNow: now,
    mySeat: player.seat,
    myReadyRevision: player.readyRevision,
    hostSeat: findPlayer(room, room.hostId)?.seat ?? 0,
    players: sorted.map((p) => {
      const rank = sorted.findIndex((other) => other.score === p.score) + 1;
      return {
        seat: p.seat,
        name: p.name,
        ready: p.ready,
        answered: p.guess !== null,
        left: p.left,
        score: p.score,
        rank,
        ...(revealed && {
          rankChange:
            1 +
            sorted.filter((other) => priorScore(other) > priorScore(p)).length -
            rank,
        }),
      };
    }),
    round: room.currentRound,
    deadline: active ? room.roundEndsAt : revealed ? room.revealEndsAt : null,
    question: question ? toPublic(question) : null,
    hints,
    availableHints:
      question && active && !player.guess ? availableHints(question) : [],
    myPick: active ? (player.guess?.choice ?? null) : null,
    reveal,
  };
}

type RoomUpdate = {
  state: PartySnapshot | null;
  version: number;
  changed: boolean;
};

export async function createRoom(
  store: GameStore,
  identity: RoomIdentity,
  requestId: string,
  clock = Date.now
): Promise<PartySnapshot> {
  const code = newCode();
  const key = roomKey(code);
  const requestKey = `wst:room-create:${identity.id}:${requestId.toLowerCase()}`;
  const roomId = randomUUID();
  const approvedIds = await availablePartyIds(store, roomId, clock());
  return withWatchedKeys(
    store,
    [
      key,
      requestKey,
      indexKey(identity.id),
      ...(approvedIds.length ? [] : [PARTY_ROTATION]),
    ],
    async () => {
      const previousCode = await store.get(requestKey);
      if (previousCode) {
        const previous = await readRoom(store, JSON.parse(previousCode));
        const player = previous && findPlayer(previous, identity.id);
        if (
          previous &&
          player &&
          !player.left &&
          previous.expiresAt > clock()
        ) {
          return {
            value: snapshot(
              previous,
              player,
              clock(),
              await currentQuestion(store, previous)
            ),
          };
        }
        throw new GameError('This room is no longer available.', 410);
      }
      if (await store.get(key))
        throw new GameError('Room code collision. Please retry.', 503);
      const player = newPlayer(identity, 1, true);
      const now = clock();
      const rotation = approvedIds.length
        ? undefined
        : ((await readJson<number>(store, PARTY_ROTATION)) ?? 0);
      const room: Room = {
        roomId,
        code,
        hostId: identity.id,
        players: [player],
        status: 'LOBBY',
        currentRound: 0,
        questionIds: approvedIds.length
          ? approvedIds
          : partyQuestionIds(rotation ?? 0, roomId),
        roundStartedAt: 0,
        roundEndsAt: 0,
        revealEndsAt: 0,
        revealMissed: 0,
        version: 1,
        expiresAt: now + PARTY.roomTtlMs,
        createdAt: now,
        nextSeat: 2,
      };
      return {
        value: snapshot(room, player, now),
        writes: [
          jsonWrite(key, room, room.expiresAt),
          jsonWrite(requestKey, code, room.expiresAt),
          await indexRoom(store, identity.id, room, now, requestKey),
          ...(rotation === undefined
            ? []
            : [jsonWrite(PARTY_ROTATION, rotation + 1, now + 90 * DAY_MS)]),
        ],
      };
    }
  );
}

const isDue = (room: Room, now: number) =>
  (room.status === 'ROUND_ACTIVE' && now >= room.roundEndsAt) ||
  (room.status === 'ROUND_REVEAL' && now >= room.revealEndsAt);

function requireRoom(room: Room | null, now: number): Room {
  if (!room) throw new GameError('Room not found or expired.', 404);
  if (now >= room.expiresAt) throw new GameError('Room expired.', 410);
  return room;
}

export async function updateRoom(
  store: GameStore,
  code: string,
  identity: RoomIdentity,
  action: PartyAction | { type: 'join' },
  clock = Date.now
): Promise<RoomUpdate> {
  const key = roomKey(code);
  const initial = requireRoom(await readRoom(store, code), clock());
  if (action.type === 'sync') {
    const player = findPlayer(initial, identity.id);
    if (!player || player.left)
      throw new GameError('You are not a member of this room.', 403);
    const now = clock();
    const question = await currentQuestion(store, initial);
    if (!isDue(initial, now) && (question || !hasActiveQuestion(initial))) {
      return {
        state: snapshot(initial, player, now, question),
        version: initial.version,
        changed: false,
      };
    }
  }
  const sources = initial.questionIds
    .filter((id) => id.startsWith('reddit-'))
    .map(snapshotKey);
  const keys =
    action.type === 'join'
      ? [key, ...sources, indexKey(identity.id)]
      : [key, ...sources];
  return withWatchedKeys<RoomUpdate>(store, keys, async () => {
    const saved = await readRoom(store, code);
    const now = clock();
    const room = requireRoom(saved, now);
    let player = findPlayer(room, identity.id);
    let changed = false;
    const writes = [];
    if (action.type === 'join' && !player) {
      if (room.status !== 'LOBBY')
        throw new GameError('This room already started or closed.');
      if (room.players.length >= WST.partyMaxPlayers)
        throw new GameError('This room is full.');
      player = newPlayer(identity, room.nextSeat++);
      room.players.push(player);
      writes.push(await indexRoom(store, identity.id, room, now));
      changed = true;
    }
    if (!player || player.left) {
      if (action.type === 'leave')
        return {
          value: { state: null, version: room.version, changed: false },
        };
      throw new GameError('You are not a member of this room.', 403);
    }
    if ('seat' in action && action.seat !== player.seat)
      throw new GameError('This request is for a previous seat.');
    let question = await currentQuestion(store, room);
    if (closeUnavailable(room, question)) changed = true;
    if (advanceDue(room, now)) {
      question = await currentQuestion(store, room);
      changed = true;
    }
    if (
      action.type !== 'join' &&
      applyAction(room, player, action, now, question)
    ) {
      question = await currentQuestion(store, room);
      changed = true;
    }
    if (closeUnavailable(room, question)) changed = true;
    if (changed) {
      room.version++;
      writes.push(jsonWrite(key, room, room.expiresAt));
    }
    return {
      value: {
        state:
          action.type === 'leave'
            ? null
            : snapshot(room, player, now, question),
        version: room.version,
        changed,
      },
      writes,
    };
  });
}

function hasActiveQuestion(room: Room) {
  return room.status === 'ROUND_ACTIVE' || room.status === 'ROUND_REVEAL';
}

function closeUnavailable(room: Room, question: QuestionRecord | undefined) {
  if (!hasActiveQuestion(room) || question) return false;
  room.status = 'CLOSED';
  room.closeReason = 'content';
  return true;
}

export async function erasePartyUser(store: GameStore, id: string) {
  const key = indexKey(id);
  // Each room is cleaned atomically with its index entry so a failed deletion can resume.
  const index = (await readJson<RoomIndex>(store, key)) ?? {};
  for (const code of Object.keys(index)) {
    const gameKey = roomKey(code);
    await withWatchedKeys(store, [key, gameKey], async () => {
      const current = await readJson<RoomIndex>(store, key);
      const removed = current?.[code];
      if (!current || !removed) return { value: undefined };
      const room = await readRoom(store, code);
      const writes = [];
      if (room && room.expiresAt > Date.now()) {
        room.players = room.players.filter((player) => player.id !== id);
        if (room.hostId === id) {
          const host = activePlayers(room)[0];
          room.hostId = host?.id ?? '';
          if (host) host.ready = true;
        }
        if (
          (room.status === 'LOBBY' && !room.players.length) ||
          (hasActiveQuestion(room) &&
            activePlayers(room).length < WST.partyMinPlayers)
        )
          room.status = 'CLOSED';
        else if (
          room.status === 'ROUND_ACTIVE' &&
          activePlayers(room).every((player) => player.guess)
        )
          revealRound(room, Date.now());
        room.version++;
        writes.push(jsonWrite(gameKey, room, room.expiresAt));
      }
      if (removed.requestKey) writes.push(deleteWrite(removed.requestKey));
      delete current[code];
      writes.push(
        Object.keys(current).length
          ? jsonWrite(
              key,
              current,
              Math.max(...Object.values(current).map((item) => item.expiresAt))
            )
          : deleteWrite(key)
      );
      return { value: undefined, writes };
    });
  }
}
