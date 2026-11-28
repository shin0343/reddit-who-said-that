import { dayOffset, expiryForDay } from './dateKey.ts';
import {
  type BoardShard,
  playerShard,
  playKey,
  recentDays,
} from './leaderboard.ts';
import { erasePartyUser } from './rooms.ts';
import {
  deleteWrite,
  jsonWrite,
  readJson,
  readMany,
  withWatchedKeys,
  type ReadManyStore,
} from './watched.ts';

export const validAccountId = (id: unknown): id is `t2_${string}` =>
  typeof id === 'string' && /^t2_[a-z0-9]{1,32}$/.test(id);

export async function erasePlayer(
  store: ReadManyStore,
  uid: string,
  today: string
) {
  const days = [...recentDays(today), dayOffset(today, -30)];
  const [plays, practice, verified, fictional] = await Promise.all([
    readMany<unknown>(
      store,
      days.map((day) => playKey(day, uid))
    ),
    readMany<unknown>(
      store,
      days.map((day) => playKey(day, uid, true))
    ),
    readMany<BoardShard>(
      store,
      days.map((day) => playerShard(day, uid))
    ),
    readMany<BoardShard>(
      store,
      days.map((day) => playerShard(day, uid, 'fictional'))
    ),
  ]);
  for (const [index, day] of days.entries()) {
    if (
      !plays[index] &&
      !practice[index] &&
      !verified[index]?.[uid] &&
      !fictional[index]?.[uid]
    )
      continue;
    const daily = playKey(day, uid);
    const tutorial = playKey(day, uid, true);
    const boards = [playerShard(day, uid), playerShard(day, uid, 'fictional')];
    await withWatchedKeys(store, [daily, tutorial, ...boards], async () => {
      const writes = [];
      for (const key of [daily, tutorial]) {
        if (await store.get(key)) writes.push(deleteWrite(key));
      }
      for (const board of boards) {
        const scores = await readJson<BoardShard>(store, board);
        if (scores?.[uid]) {
          delete scores[uid];
          writes.push(
            Object.keys(scores).length
              ? jsonWrite(board, scores, expiryForDay(day))
              : deleteWrite(board)
          );
        }
      }
      return { value: undefined, writes };
    });
  }
  await erasePartyUser(store, uid);
}
