import { connectRealtime, disconnectRealtime } from '@devvit/web/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  roomChannel,
  type PartyAction,
  type PartySnapshot,
} from '../../../shared/games/who-said-that/party';
import { ApiError, gameErrorMessage, gameRequest } from './api';

type TimedSnapshot = { state: PartySnapshot; receivedAt: number };

export const secondsRemaining = (
  { state, receivedAt }: TimedSnapshot,
  now: number
) =>
  Math.max(
    0,
    Math.ceil(
      ((state.deadline ?? state.serverNow) -
        state.serverNow -
        Math.max(0, now - receivedAt)) /
        1000
    )
  );

export function useRoomChannel(
  code: string,
  initial: PartySnapshot | null,
  onUnavailable: (message: string) => void
) {
  const [snapshot, setSnapshot] = useState<TimedSnapshot | null>(() =>
    initial ? { state: initial, receivedAt: performance.now() } : null
  );
  const [live, setLive] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const version = useRef(initial?.version ?? 0);
  const announced = useRef(0);
  const refreshing = useRef(false);
  const mounted = useRef(false);

  const accept = useCallback((state: PartySnapshot, requestedAt: number) => {
    if (!mounted.current || state.version < version.current) return;
    version.current = state.version;
    const receivedAt = (requestedAt + performance.now()) / 2;
    setSnapshot((old) =>
      old &&
      state.version === old.state.version &&
      state.serverNow < old.state.serverNow
        ? old
        : { state, receivedAt }
    );
  }, []);

  const sync = useCallback(async () => {
    if (!mounted.current || refreshing.current) return;
    refreshing.current = true;
    try {
      const path = `/party/${encodeURIComponent(code)}`;
      const requestedAt = performance.now();
      const next = await gameRequest<PartySnapshot>(path, { type: 'sync' });
      if (!mounted.current) return;
      accept(next, requestedAt);
      setRefreshError('');
      // An event may arrive while a read for the previous version is in flight.
      if (
        announced.current > next.version &&
        announced.current > version.current
      ) {
        const retryAt = performance.now();
        accept(
          await gameRequest<PartySnapshot>(path, { type: 'sync' }),
          retryAt
        );
      }
    } catch (error) {
      if (!mounted.current) return;
      if (
        error instanceof ApiError &&
        [401, 403, 404, 410].includes(error.status)
      ) {
        onUnavailable(error.message);
      } else {
        setRefreshError(gameErrorMessage(error));
      }
    } finally {
      refreshing.current = false;
    }
  }, [accept, code, onUnavailable]);

  const act = async (action: PartyAction) => {
    const requestedAt = performance.now();
    const next = await gameRequest<PartySnapshot | null>(
      `/party/${encodeURIComponent(code)}`,
      action
    );
    if (next) accept(next, requestedAt);
  };

  useEffect(() => {
    mounted.current = true;
    const channel = roomChannel(code);
    let active = true;
    try {
      connectRealtime({
        channel,
        onConnect: () => {
          if (!active) return;
          setLive(true);
          void sync();
        },
        onDisconnect: () => {
          if (!active) return;
          setLive(false);
          void sync();
        },
        onMessage: (data) => {
          if (
            !active ||
            !data ||
            typeof data !== 'object' ||
            !('version' in data) ||
            typeof data.version !== 'number' ||
            data.version <= version.current
          )
            return;
          announced.current = Math.max(announced.current, data.version);
          void sync();
        },
      });
    } catch {
      // Polling also covers clients that never receive a subscription callback.
    }
    const refresh = () => {
      void sync();
    };
    const visible = () => {
      if (!document.hidden) refresh();
    };
    refresh();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      mounted.current = false;
      active = false;
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
      try {
        disconnectRealtime(channel);
      } catch {
        /* WebView may already be closed. */
      }
    };
  }, [code, sync]);

  const phase = snapshot?.state.status;
  useEffect(() => {
    if (phase === 'CLOSED' || phase === 'FINISHED') return;
    const interval = window.setInterval(
      () => {
        if (!document.hidden) void sync();
      },
      live ? 7_000 : 1_700
    );
    return () => window.clearInterval(interval);
  }, [live, phase, sync]);

  const deadline = snapshot?.state.deadline;
  useEffect(() => {
    if (!snapshot || deadline == null) return;
    const remaining =
      deadline -
      snapshot.state.serverNow -
      (performance.now() - snapshot.receivedAt);
    const timeout = window.setTimeout(
      () => void sync(),
      Math.max(0, remaining) + 200
    );
    return () => window.clearTimeout(timeout);
  }, [deadline, snapshot, sync]);

  return { snapshot, live, refreshError, sync, act };
}
