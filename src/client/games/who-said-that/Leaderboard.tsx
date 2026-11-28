import { useEffect, useState } from 'react';
import type {
  BoardRow,
  DailyBoard,
} from '../../../shared/games/who-said-that/community';
import { gameErrorMessage, gameRequest } from './api';
import { GameFrame } from './CaseCards';
import { modeName, secondaryButton } from './presentation';

export function ScoreRows({ rows }: { rows: BoardRow[] }) {
  return (
    <ol className="text-sm" aria-label="Ranked scores">
      {rows.map((row, index) => (
        <li
          key={index}
          className={`score-row tabular-nums ${row.you ? 'font-bold' : ''}`}
        >
          <span>#{row.rank}</span>
          <span>
            {row.you ? 'You' : 'Player'} · {row.correct} solved
          </span>
          <span>{row.score} pts</span>
        </li>
      ))}
    </ol>
  );
}

export function Leaderboard({ onHome }: { onHome: () => void }) {
  const [board, setBoard] = useState<DailyBoard | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void gameRequest<DailyBoard>('/daily/board', undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setBoard(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(gameErrorMessage(err));
      });
    return () => controller.abort();
  }, [refresh]);

  return (
    <GameFrame title="Daily Leaderboard" onHome={onHome}>
      {error ? (
        <p role="alert" className="notice">
          {error}
        </p>
      ) : !board ? (
        <p role="status" className="notice">
          Loading standings…
        </p>
      ) : (
        <section className="report-sheet report-lead">
          <p className="case-mode">{board.dateKey}</p>
          {board.mode !== 'practice' && (
            <h2>{modeName(board.mode === 'fictional')}</h2>
          )}
          {board.top.length ? (
            <>
              <p>
                {board.participants} finished
                {board.personalRank !== null &&
                  ` · Your rank #${board.personalRank}`}
              </p>
              <ScoreRows rows={board.top} />
              <p className="case-mode">
                Ranked by score, then earliest finish.
              </p>
            </>
          ) : (
            <p>
              {board.mode === 'practice'
                ? 'Today’s cases are open for unranked play.'
                : 'No detectives have finished today’s case yet.'}
            </p>
          )}
        </section>
      )}
      {(error || board) && (
        <button
          className={secondaryButton}
          onClick={() => {
            setError('');
            setBoard(null);
            setRefresh((value) => value + 1);
          }}
        >
          Refresh standings
        </button>
      )}
    </GameFrame>
  );
}
