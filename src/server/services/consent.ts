import type { ContentPermission } from '../../shared/games/who-said-that/community.ts';
import { DAY_MS } from './dateKey.ts';
import {
  GameError,
  jsonWrite,
  readJson,
  withWatchedKeys,
  type GameStore,
} from './watched.ts';

type Consent = { state: 'active' | 'withdrawn'; at: number };
export const consentKey = (commentId: string) => `wst:consent:${commentId}`;
export const readConsent = (store: GameStore, commentId: string) =>
  readJson<Consent>(store, consentKey(commentId));

export async function recordConsent(
  store: GameStore,
  commentId: string,
  state: Consent['state'],
  now = Date.now()
) {
  const key = consentKey(commentId);
  await withWatchedKeys(store, [key], async () => {
    const current = await readConsent(store, commentId);
    if (current?.state === state) return { value: undefined };
    return {
      value: undefined,
      writes: [jsonWrite(key, { state, at: now }, now + 365 * DAY_MS)],
    };
  });
}

export async function verifyConsent(
  store: GameStore,
  commentId: string,
  permission?: ContentPermission
) {
  if (!permission)
    throw new GameError('Author permission evidence is missing.');
  const consent = await readConsent(store, commentId);
  if (consent?.state === 'withdrawn')
    throw new GameError('The author withdrew permission.');
  if (
    permission.kind === 'author-opt-in' &&
    (consent?.state !== 'active' || consent.at !== permission.at)
  ) {
    throw new GameError('The author’s permission changed or expired.');
  }
}
