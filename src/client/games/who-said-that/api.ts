import { context } from '@devvit/web/client';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function gameRequest<T>(
  path: string,
  action?: object,
  signal?: AbortSignal
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = window.setTimeout(
    abort,
    path === '/daily/play' ? 25_000 : 12_000
  );
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(`/api/wst${path}`, {
      cache: 'no-store',
      signal: controller.signal,
      ...(action && {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      }),
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const message =
        body &&
        typeof body === 'object' &&
        'error' in body &&
        typeof body.error === 'string'
          ? body.error
          : 'Could not reach the game. Try again.';
      throw new ApiError(message, response.status);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export const gameErrorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Connection interrupted. Try again.';

export function savedRoom(
  username: string,
  code?: string | null
): string | null {
  try {
    const key = `wst:room:${context?.subredditId ?? context?.postId ?? 'game'}:${username}`;
    if (code === null) localStorage.removeItem(key);
    else if (code !== undefined) localStorage.setItem(key, code);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
