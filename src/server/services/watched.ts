type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 410 | 429 | 503;

export class GameError extends Error {
  readonly status: ErrorStatus;

  constructor(message: string, status: ErrorStatus = 409) {
    super(message);
    this.status = status;
  }
}

type Transaction = {
  multi(): Promise<void>;
  set(
    key: string,
    value: string,
    options: { expiration: Date }
  ): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  exec(): Promise<readonly unknown[] | null>;
  discard(): Promise<unknown>;
  unwatch(): Promise<unknown>;
};

export type GameStore = {
  get(key: string): Promise<string | undefined>;
  watch(...keys: string[]): Promise<Transaction>;
};

type Write =
  | { key: string; value: string; expiresAt: number }
  | { key: string; remove: true };

export const deleteWrite = (key: string): Write => ({ key, remove: true });

export const jsonWrite = (
  key: string,
  value: unknown,
  expiresAt: number
): Write => ({ key, value: JSON.stringify(value), expiresAt });

export async function withWatchedKeys<T>(
  store: GameStore,
  keys: string[],
  read: () => Promise<{ value: T; writes?: Write[] }>
): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const tx = await store.watch(...keys);
    let started = false;
    let executed = false;
    try {
      const { value, writes } = await read();
      if (!writes?.length) return value;
      await tx.multi();
      started = true;
      for (const write of writes) {
        if ('remove' in write) await tx.del(write.key);
        else
          await tx.set(write.key, write.value, {
            expiration: new Date(write.expiresAt),
          });
      }
      const result = await tx.exec().catch((error: unknown) => {
        if (
          error instanceof Error &&
          /redis: transaction failed|redis: nil/i.test(error.message)
        )
          return null;
        throw error;
      });
      executed = true;
      // Devvit represents a WATCH abort with no command results.
      if (
        result?.length === writes.length &&
        result.every(
          (reply, i) =>
            reply === 'OK' ||
            (typeof reply === 'number' && 'remove' in writes[i]!)
        )
      )
        return value;
      if (result?.some((reply) => reply != null))
        throw new Error('Unexpected Redis EXEC response');
    } finally {
      if (!executed) {
        await (started ? tx.discard() : tx.unwatch()).catch(() => undefined);
      }
    }
    await new Promise((resolve) =>
      setTimeout(resolve, 5 + Math.random() * 10 * (attempt + 1))
    );
  }
  throw new GameError('Game state is busy. Please retry.', 503);
}

export type ReadManyStore = GameStore & {
  mGet(keys: string[]): Promise<(string | null)[]>;
};

export async function readJson<T>(
  store: GameStore,
  key: string
): Promise<T | null> {
  const value = await store.get(key);
  return value ? JSON.parse(value) : null;
}

export async function readMany<T>(
  store: ReadManyStore,
  keys: string[]
): Promise<(T | null)[]> {
  if (!keys.length) return [];
  return (await store.mGet(keys)).map((value) =>
    value ? JSON.parse(value) : null
  );
}
