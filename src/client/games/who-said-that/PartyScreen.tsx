import { navigateTo } from '@devvit/web/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WST } from '../../../shared/games/who-said-that/contracts';
import {
  PARTY,
  type PartyAction,
  type PartyPlayer,
  type PartySnapshot,
} from '../../../shared/games/who-said-that/party';
import { ApiError, gameErrorMessage, gameRequest, savedRoom } from './api';
import { CaseProgress, GameFrame, QuestionCard, RevealCard } from './CaseCards';
import { modeName, primaryButton, secondaryButton } from './presentation';
import { secondsRemaining, useRoomChannel } from './useRoomChannel';

function PlayerList({
  players,
  mySeat,
  hostSeat,
  lobby,
  active,
  final,
  round,
}: {
  players: PartyPlayer[];
  mySeat: number;
  hostSeat: number;
  lobby: boolean;
  active: boolean;
  final: boolean;
  round: number;
}) {
  return (
    <ol aria-label={lobby ? 'Players' : 'Scoreboard'} className="grid gap-2">
      {players.map((player) => (
        <li
          key={player.seat}
          className="player-row flex flex-wrap items-center gap-2 text-sm"
          data-podium={final && player.rank <= 3 ? player.rank : undefined}
        >
          <span
            aria-label={lobby ? undefined : `Rank ${player.rank}`}
            aria-hidden={lobby || undefined}
            className="player-rank grid size-8 shrink-0 place-items-center rounded-full border border-[var(--line)] font-bold"
          >
            {lobby ? player.name.slice(0, 1).toUpperCase() : player.rank}
          </span>
          <span className="wrap-text min-w-0 grow basis-24 font-semibold">
            u/{player.name}
            {player.seat === mySeat ? ' (you)' : ''}
            {player.seat === hostSeat && (
              <small className="ms-2 font-medium text-[var(--muted)]">
                Host
              </small>
            )}
          </span>
          <span className="shrink-0 text-xs text-[var(--muted)]">
            {player.left
              ? 'Left'
              : lobby
                ? player.ready
                  ? 'Ready'
                  : 'Getting ready'
                : active && (player.answered ? 'Locked in' : 'Thinking')}
          </span>
          {!lobby && (
            <span className="shrink-0 tabular-nums">{player.score} pts</span>
          )}
          {!!player.rankChange && (
            <span className="rank-shift text-xs" key={round}>
              {player.rankChange > 0
                ? `Up ${player.rankChange}`
                : `Down ${-player.rankChange}`}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function RoomView({
  code,
  initial,
  onLeave,
  onUnavailable,
}: {
  code: string;
  initial: PartySnapshot | null;
  onLeave: () => void;
  onUnavailable: (message: string) => void;
}) {
  const { snapshot, live, refreshError, sync, act } = useRoomChannel(
    code,
    initial,
    onUnavailable
  );
  const [now, setNow] = useState(() => performance.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [clipboard, setClipboard] = useState('');
  const state = snapshot?.state;
  const hasDeadline = state?.deadline != null;

  useEffect(() => {
    if (!hasDeadline) return;
    const interval = window.setInterval(() => setNow(performance.now()), 160);
    return () => window.clearInterval(interval);
  }, [hasDeadline]);

  const send = async (action: PartyAction) => {
    setError('');
    setBusy(true);
    try {
      await act(action);
      if (action.type === 'leave') onLeave();
    } catch (err) {
      if (
        action.type === 'leave' &&
        err instanceof ApiError &&
        [403, 404, 410].includes(err.status)
      )
        onLeave();
      else {
        setError(gameErrorMessage(err));
        void sync();
      }
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot || !state) {
    return (
      <p role="status" className="notice">
        {refreshError || 'Reconnecting to your room…'}
      </p>
    );
  }
  const lobby = state.status === 'LOBBY';
  const active = state.status === 'ROUND_ACTIVE';
  const final = state.status === 'FINISHED';
  const closed = state.status === 'CLOSED';
  const host = state.hostSeat === state.mySeat;
  const me = state.players.find((player) => player.seat === state.mySeat);
  const canStart =
    state.players.length >= WST.partyMinPlayers &&
    state.players.every((player) => player.ready);
  const seconds = secondsRemaining(snapshot, now);

  return (
    <>
      {!final && !closed && (
        <p className="text-xs text-[var(--muted)]" role="status">
          {refreshError ? 'Reconnecting…' : live ? 'Live' : 'Syncing…'}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {(lobby || final) && (
        <p className="case-mode">
          {modeName(state.content === 'fictional')}
          {lobby &&
            (state.content === 'fictional'
              ? ' · Original fictional cases'
              : ' · Verified Reddit comments')}
        </p>
      )}
      {lobby && (
        <div className="party-code grid gap-1">
          <span className="case-mode">
            Invite detectives with this room code
          </span>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <code className="select-all" aria-label="Room code">
              {code}
            </code>
            <button
              className={secondaryButton}
              onClick={() => {
                void (async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setClipboard('Code copied');
                  } catch {
                    setClipboard('Select the code to copy');
                  }
                })();
              }}
            >
              Copy code
            </button>
          </div>
          {clipboard && (
            <p className="case-mode" role="status">
              {clipboard}
            </p>
          )}
        </div>
      )}
      {state.question && (
        <>
          <CaseProgress
            step={state.round + 1}
            total={PARTY.rounds}
            score={me?.score ?? 0}
          >
            <span className="party-clock" data-urgent={active && seconds <= 5}>
              {active
                ? `${seconds}s left`
                : `${state.round + 1 === PARTY.rounds ? 'Results' : 'Next round'} in ${seconds}s`}
            </span>
          </CaseProgress>
          {active && (
            <progress
              className="party-clock-track"
              data-urgent={seconds <= 5}
              aria-label="Time remaining"
              max={PARTY.roundMs / 1_000}
              value={seconds}
            />
          )}
        </>
      )}
      {active && state.question && (
        <>
          <QuestionCard
            key={state.question.id}
            question={state.question}
            hints={state.hints}
            availableHints={state.availableHints}
            locked={state.myPick}
            disabled={busy || seconds === 0}
            onGuess={(choice) =>
              void send({ type: 'guess', round: state.round, choice })
            }
            onHint={(kind) =>
              void send({ type: 'hint', round: state.round, kind })
            }
          />
        </>
      )}
      {state.reveal && (
        <>
          <RevealCard
            key={state.reveal.questionId}
            result={state.reveal}
            hintsUsed={state.reveal.hintsUsed}
            pick={state.reveal.pick}
            counts={state.reveal.counts}
            fictional={state.content === 'fictional'}
          >
            <p className="case-mode wrap-text">
              {state.reveal.responses} answered · {state.reveal.missed} timed
              out
              {state.reveal.popularWrong.length > 0 &&
                ` · Top wrong pick: ${state.reveal.popularWrong.map((choice) => `r/${choice}`).join(', ')}`}
            </p>
          </RevealCard>
          {state.reveal.permalink && (
            <button
              className={secondaryButton}
              onClick={() => navigateTo(state.reveal?.permalink ?? '')}
            >
              View original discussion
            </button>
          )}
        </>
      )}
      <section
        aria-label={lobby ? 'Lobby' : 'Room standings'}
        className={
          final ? 'report-sheet report-lead screen-enter' : 'grid gap-2'
        }
      >
        <h2 className="font-bold">
          {lobby
            ? `Lobby · ${state.players.length}/${WST.partyMaxPlayers} players`
            : final
              ? 'Investigation complete'
              : closed
                ? 'Room closed'
                : active
                  ? 'Player status'
                  : 'Standings'}
        </h2>
        {final && me && (
          <p>
            Your score · {me.score} pts · Rank #{me.rank}
          </p>
        )}
        {closed && (
          <p className="text-sm">
            {state.closeReason === 'content'
              ? 'A case was withdrawn. Create a new room to play again.'
              : 'At least two players are needed to keep playing.'}
          </p>
        )}
        <PlayerList
          players={state.players}
          mySeat={state.mySeat}
          hostSeat={state.hostSeat}
          lobby={lobby}
          active={active}
          final={final}
          round={state.round}
        />
      </section>
      {lobby &&
        (host ? (
          <>
            {!canStart && (
              <p className="text-sm text-[var(--muted)]">
                Waiting for at least two players and everyone ready.
              </p>
            )}
            <button
              className={primaryButton}
              disabled={busy || !canStart}
              onClick={() => void send({ type: 'start' })}
            >
              Start game
            </button>
          </>
        ) : (
          <button
            className={primaryButton}
            disabled={busy}
            onClick={() =>
              void send({
                type: 'ready',
                seat: state.mySeat,
                revision: state.myReadyRevision,
                ready: !me?.ready,
              })
            }
          >
            {me?.ready ? 'Unready' : 'Ready up'}
          </button>
        ))}
      <button
        className={secondaryButton}
        disabled={busy}
        onClick={() => void send({ type: 'leave', seat: state.mySeat })}
      >
        {final || closed ? 'Back to Party' : 'Leave room'}
      </button>
    </>
  );
}

export const PartyScreen = ({
  username,
  onHome,
}: {
  username: string;
  onHome: () => void;
}) => {
  const [room, setRoom] = useState<{
    code: string;
    snapshot: PartySnapshot | null;
  } | null>(() => {
    const code = savedRoom(username);
    return code ? { code, snapshot: null } : null;
  });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef('');

  const close = useCallback(
    (message: string) => {
      savedRoom(username, null);
      setRoom(null);
      setError(message);
    },
    [username]
  );

  const enter = async (create: boolean) => {
    setBusy(true);
    setError('');
    try {
      if (create && !requestId.current) requestId.current = crypto.randomUUID();
      const snapshot = create
        ? await gameRequest<PartySnapshot>('/party/create', {
            requestId: requestId.current,
          })
        : await gameRequest<PartySnapshot>(
            `/party/${encodeURIComponent(code.trim().toUpperCase())}`,
            { type: 'join' }
          );
      requestId.current = '';
      savedRoom(username, snapshot.code);
      setRoom({ code: snapshot.code, snapshot });
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) requestId.current = '';
      setError(gameErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameFrame title="Multiplayer Party" onHome={onHome}>
      {room ? (
        <RoomView
          key={room.code}
          code={room.code}
          initial={room.snapshot}
          onLeave={() => close('')}
          onUnavailable={close}
        />
      ) : (
        <>
          <p className="text-sm text-[var(--muted)]">
            2–6 players · 5 shared cases
          </p>
          <button
            className={primaryButton}
            disabled={busy}
            onClick={() => void enter(true)}
          >
            Create room
          </button>
          <form
            className="desk-form"
            onSubmit={(event) => {
              event.preventDefault();
              void enter(false);
            }}
          >
            <label className="text-sm font-semibold" htmlFor="room-code">
              Room code
            </label>
            <input
              id="room-code"
              className="min-h-11 rounded-lg border border-[var(--line)] px-3 uppercase"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={code}
              maxLength={PARTY.codeLength + 4}
              onChange={(event) => setCode(event.target.value)}
              required
            />
            <button className={secondaryButton} disabled={busy}>
              Join room
            </button>
          </form>
          {busy && (
            <p className="text-sm" role="status">
              Connecting…
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm">
              {error}
            </p>
          )}
        </>
      )}
    </GameFrame>
  );
};
