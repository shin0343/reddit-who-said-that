import { useEffect, useState } from 'react';
import type { DailyProgress } from '../../../shared/games/who-said-that/contracts';
import { ChoiceDistribution } from './CaseCards';
import { modeName, primaryButton, secondaryButton } from './presentation';
import { ScoreRows } from './Leaderboard';

export function DailyResults({
  state,
  onReload,
  busy,
  practice = false,
  onDaily,
  onParty,
}: {
  practice?: boolean;
  onDaily?: (() => void) | undefined;
  onParty?: (() => void) | undefined;
  state: DailyProgress;
  busy: boolean;
  onReload: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, state.nextDailyAt - state.serverNow)
  );
  const [shareStatus, setShareStatus] = useState('');
  const [showText, setShowText] = useState(false);
  useEffect(() => {
    const started = performance.now();
    const update = () =>
      setRemaining(
        Math.max(
          0,
          state.nextDailyAt - state.serverNow - (performance.now() - started)
        )
      );
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [state.serverNow, state.nextDailyAt]);

  const stats = state.community;
  const seconds = Math.ceil(remaining / 1_000);
  const countdown = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
  const solved = state.outcomes.filter(Boolean).length;

  return (
    <div className="grid gap-4">
      <section
        aria-label="Daily results"
        className="report-sheet report-lead screen-enter"
      >
        <p className="case-mode">
          {practice
            ? 'Tutorial · Unranked'
            : state.pack.mode === 'practice'
              ? `Unranked · ${state.dateKey}`
              : `${modeName(state.pack.mode === 'fictional')} · ${state.dateKey}`}
        </p>
        <h2>{practice ? 'Tutorial complete' : 'Investigation complete'}</h2>
        <p>
          <strong>Detective rank</strong> ·{' '}
          {solved >= 5
            ? 'Lead Detective'
            : solved >= 3
              ? 'Case Detective'
              : 'Junior Detective'}
        </p>
        <div className="share-strip" aria-label="Case outcomes">
          {state.outcomes.map((value, index) => (
            <span
              key={index}
              role="img"
              aria-label={`Case ${index + 1} ${value === null ? 'withdrawn' : value ? 'solved' : 'missed'}`}
              data-outcome={String(value)}
            >
              {value === null ? '–' : value ? '✓' : '×'}
            </span>
          ))}
        </div>
        <dl className="report-stats">
          <div>
            <dt>Score</dt>
            <dd>{state.total}</dd>
          </div>
          <div>
            <dt>Cases solved</dt>
            <dd>
              {solved}/{state.outcomes.filter((value) => value !== null).length}
            </dd>
          </div>
          {stats && (
            <>
              <div>
                <dt>Daily rank</dt>
                <dd>#{stats.personalRank}</dd>
              </div>
              <div>
                <dt>Streak</dt>
                <dd>{stats.streak.current}d</dd>
              </div>
              <div>
                <dt>Personal best</dt>
                <dd>{stats.bestScore}</dd>
              </div>
            </>
          )}
        </dl>
        {practice && (
          <div className="home-actions">
            {onDaily && (
              <button className={primaryButton} onClick={onDaily}>
                Play Daily Case
              </button>
            )}
            {onParty && (
              <button className={secondaryButton} onClick={onParty}>
                Multiplayer Party
              </button>
            )}
          </div>
        )}
        {stats && (
          <>
            <button
              className={primaryButton}
              onClick={() => {
                void (async () => {
                  try {
                    await navigator.clipboard.writeText(stats.shareText);
                    setShareStatus('Result copied');
                  } catch {
                    setShowText(true);
                    setShareStatus('Select the text to copy your result.');
                  }
                })();
              }}
            >
              Share results
            </button>
            {shareStatus && (
              <p role="status" className="text-sm">
                {shareStatus}
              </p>
            )}
            {showText && (
              <textarea
                aria-label="Share result"
                className="w-full rounded border border-[var(--line)] p-2"
                rows={6}
                readOnly
                value={stats.shareText}
                onFocus={(event) => event.currentTarget.select()}
              />
            )}
          </>
        )}
      </section>
      {!practice && (
        <section aria-label="Next Daily" className="report-sheet">
          {seconds > 0 ? (
            <p className="tabular-nums">
              Next Daily in {countdown}{' '}
              <span className="text-sm text-[var(--muted)]">· 00:00 UTC</span>
            </p>
          ) : (
            <button
              className={primaryButton}
              disabled={busy}
              onClick={onReload}
            >
              Open the new Daily
            </button>
          )}
        </section>
      )}
      {stats && (
        <>
          <section className="report-sheet" aria-label="Daily Leaderboard">
            <h2 className="font-bold">Daily Leaderboard</h2>
            <p className="text-sm">
              {stats.participants} finished · Your rank #{stats.personalRank}
            </p>
            {stats.percentile !== null && (
              <p className="text-sm">
                You outscored {stats.percentile}% of other finishers.
              </p>
            )}
            <ScoreRows rows={stats.top} />
            <p className="case-mode">
              Best streak {stats.streak.longest}d · Records cover the last 30
              days.
            </p>
            {seconds > 0 && (
              <button
                className={secondaryButton}
                onClick={onReload}
                disabled={busy}
              >
                Refresh standings
              </button>
            )}
          </section>
          <section className="report-sheet" aria-label="Community Intelligence">
            <h2 className="font-bold">Community Intelligence</h2>
            {stats.cases.length ? (
              <>
                <p className="text-sm">
                  Hardest {stats.hardest.length === 1 ? 'case' : 'cases'} ·{' '}
                  {stats.hardest.map((round) => `#${round}`).join(', ')}
                </p>
                {stats.cases.map((stat) => (
                  <details
                    key={stat.round}
                    className="border-t border-[var(--line)] pt-2 text-sm"
                  >
                    <summary className="min-h-11 cursor-pointer py-2">
                      Case {stat.round} · {Math.round(100 * stat.correctRate)}%
                      correct
                    </summary>
                    <ChoiceDistribution
                      distribution={stat.distribution}
                      answer={stat.answer}
                    />
                    {stat.popularWrong.length > 0 && (
                      <p className="my-2 break-words">
                        Top wrong pick ·{' '}
                        {stat.popularWrong
                          .map((name) => `r/${name}`)
                          .join(', ')}
                      </p>
                    )}
                  </details>
                ))}
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                More detectives are needed to reveal the community’s deductions.{' '}
                {stats.participants}/5 finished.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
