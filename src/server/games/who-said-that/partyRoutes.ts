import { context, realtime, reddit, redis, settings } from '@devvit/web/server';
import { Hono } from 'hono';
import {
  PARTY,
  roomChannel,
  type PartyAction,
} from '../../../shared/games/who-said-that/party.ts';
import { createRoom, updateRoom, validRoomCode } from '../../services/rooms.ts';
import { GameError } from '../../services/watched.ts';
import { isHint } from './round.ts';

export async function partyEnabled() {
  try {
    return (await settings.get('partyEnabled')) !== false;
  } catch (error) {
    console.warn('[party] settings unavailable', error);
    return false;
  }
}

export const partyRoutes = new Hono<{ Variables: { userId: string } }>();

partyRoutes.onError((error, c) => {
  if (error instanceof GameError)
    return c.json({ error: error.message }, error.status);
  console.error('[party] request failed', error);
  return c.json({ error: 'Party Room is temporarily unavailable.' }, 503);
});

partyRoutes.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  if (!(await partyEnabled()))
    throw new GameError('Party Rooms are disabled.', 403);
  if (!context.userId)
    throw new GameError('Sign in to Reddit to play Party.', 401);
  c.set('userId', context.userId);
  await next();
});

partyRoutes.post('/create', async (c) => {
  const body: unknown = await c.req.json().catch(() => null);
  if (
    !body ||
    typeof body !== 'object' ||
    !('requestId' in body) ||
    typeof body.requestId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      body.requestId
    )
  ) {
    throw new GameError('Invalid room creation request.', 400);
  }
  const name = await reddit.getCurrentUsername();
  if (!name) throw new GameError('Sign in to Reddit to play Party.', 401);
  return c.json(
    await createRoom(redis, { id: c.get('userId'), name }, body.requestId)
  );
});

function parseAction(body: unknown): PartyAction | { type: 'join' } {
  if (body && typeof body === 'object' && 'type' in body) {
    switch (body.type) {
      case 'join':
      case 'sync':
      case 'start':
        return { type: body.type };
      case 'leave':
      case 'ready':
        if (
          'seat' in body &&
          typeof body.seat === 'number' &&
          Number.isSafeInteger(body.seat) &&
          body.seat > 0
        ) {
          if (body.type === 'leave') return { type: 'leave', seat: body.seat };
          if (
            'ready' in body &&
            typeof body.ready === 'boolean' &&
            'revision' in body &&
            typeof body.revision === 'number' &&
            Number.isSafeInteger(body.revision) &&
            body.revision >= 0
          ) {
            return {
              type: 'ready',
              seat: body.seat,
              revision: body.revision,
              ready: body.ready,
            };
          }
        }
        break;
      case 'guess':
      case 'hint':
        if (
          'round' in body &&
          typeof body.round === 'number' &&
          Number.isInteger(body.round) &&
          body.round >= 0 &&
          body.round < PARTY.rounds
        ) {
          if (
            body.type === 'guess' &&
            'choice' in body &&
            typeof body.choice === 'string' &&
            body.choice.length <= 32
          ) {
            return { type: 'guess', round: body.round, choice: body.choice };
          }
          if (body.type === 'hint' && 'kind' in body && isHint(body.kind)) {
            return { type: 'hint', round: body.round, kind: body.kind };
          }
        }
        break;
    }
  }
  throw new GameError('Invalid room action.', 400);
}

partyRoutes.post('/:code', async (c) => {
  const code = c.req.param('code').trim().toUpperCase();
  if (!validRoomCode(code))
    throw new GameError('Enter a valid room code.', 400);
  const action = parseAction(await c.req.json().catch(() => null));
  const name = action.type === 'join' ? await reddit.getCurrentUsername() : '';
  if (action.type === 'join' && !name)
    throw new GameError('Sign in to Reddit to play Party.', 401);
  const update = await updateRoom(
    redis,
    code,
    { id: c.get('userId'), name: name ?? '' },
    action
  );
  if (update.changed) {
    await realtime
      .send(roomChannel(code), { version: update.version })
      .catch((error) => {
        console.warn('[party] realtime delivery failed', error);
      });
  }
  return c.json(update.state);
});
