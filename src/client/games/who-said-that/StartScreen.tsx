import { useEffect, useState } from 'react';
import type { WstMetaResponse } from '../../../shared/games/who-said-that/contracts';
import type { DailyBrief } from '../../../shared/games/who-said-that/community';
import { AgencyHero } from './Brand';
import { Leaderboard } from './Leaderboard';
import { ContributionForm } from './ContributionForm';
import { CurationScreen } from './CurationScreen';
import { gameErrorMessage, gameRequest, savedRoom } from './api';
import { modeName, primaryButton, secondaryButton } from './presentation';
import { DailyScreen } from './DailyScreen';
import { PartyScreen } from './PartyScreen';

export const StartScreen = () => {
  const [meta, setMeta] = useState<WstMetaResponse | null>(null);
  const [screen, setScreen] = useState<
    'home' | 'daily' | 'practice' | 'party' | 'curation' | 'board'
  >('home');

  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [privacy, setPrivacy] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void gameRequest<WstMetaResponse>('/meta', undefined, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setMeta(data);
        if (
          data.modes.includes('party') &&
          data.username &&
          savedRoom(data.username)
        ) {
          setScreen((current) => (current === 'home' ? 'party' : current));
        }
      })
      .catch(() => {
        /* Direct Daily entry stays available. */
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (screen === 'home') window.scrollTo(0, 0);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'home') return;
    const controller = new AbortController();
    void gameRequest<DailyBrief>('/daily/brief', undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setBrief(data);
      })
      .catch(() => {
        // The Daily action also works when the brief is unavailable.
      });
    return () => controller.abort();
  }, [screen, privacy]);

  if (screen === 'board')
    return <Leaderboard onHome={() => setScreen('home')} />;
  if (screen === 'curation' && meta?.canCurate)
    return <CurationScreen onHome={() => setScreen('home')} />;
  if (screen === 'practice')
    return (
      <DailyScreen
        key="tutorial"
        practice
        onHome={() => setScreen('home')}
        onDaily={() => setScreen('daily')}
        onParty={
          meta?.username && meta.modes.includes('party')
            ? () => setScreen('party')
            : undefined
        }
      />
    );
  if (screen === 'daily')
    return <DailyScreen key="daily" onHome={() => setScreen('home')} />;
  if (screen === 'party' && meta?.username)
    return (
      <PartyScreen username={meta.username} onHome={() => setScreen('home')} />
    );

  const dailyAction =
    brief?.progress === 'finished'
      ? 'View Daily results'
      : brief?.progress === 'in-progress'
        ? 'Resume Daily Case'
        : 'Start Daily Case';

  return (
    <main className="home-frame screen-enter">
      <AgencyHero />
      <section className="home-docket" aria-label="Daily case">
        <div className="docket-meta">
          <time dateTime={brief?.dateKey ?? meta?.dateKey}>
            {brief?.dateKey ?? meta?.dateKey}
          </time>
          {brief && meta?.username && (
            <strong>{brief.streak}-day streak</strong>
          )}
        </div>
        <h2 className="docket-title">Daily Case</h2>
        <p>Five comments. Find the community behind each one.</p>
        {brief && (
          <p className="case-mode">
            {brief.mode === 'practice'
              ? 'Unranked'
              : modeName(brief.mode === 'fictional')}
            {' · '}
            {brief.progress === 'finished'
              ? 'Complete'
              : brief.progress === 'in-progress'
                ? `Case ${brief.round + 1} of ${meta?.rounds ?? 5}`
                : brief.mode === 'fictional'
                  ? 'Original fictional cases'
                  : 'Ready to open'}
          </p>
        )}
        <button className={primaryButton} onClick={() => setScreen('daily')}>
          {dailyAction}
        </button>
      </section>
      <nav className="home-actions" aria-label="Game modes and rankings">
        {meta?.modes.includes('party') && meta.username && (
          <button
            className={`${secondaryButton} home-party`}
            onClick={() => setScreen('party')}
          >
            Multiplayer Party
          </button>
        )}
        <button
          className={secondaryButton}
          onClick={() => setScreen('practice')}
        >
          Tutorial
        </button>
        <button className={secondaryButton} onClick={() => setScreen('board')}>
          Leaderboard
        </button>
      </nav>
      {meta?.modes.includes('party') && !meta.username && (
        <p className="case-mode">
          Sign in to Reddit to play Multiplayer Party.
        </p>
      )}
      {meta?.canCurate && (
        <button
          className={secondaryButton}
          onClick={() => setScreen('curation')}
        >
          Content curation
        </button>
      )}
      {meta?.username && <ContributionForm />}
      {meta?.username && (
        <details className="text-sm text-[var(--muted)]">
          <summary className="desk-link">Game data</summary>
          {confirmDelete ? (
            <div className="grid gap-2">
              <p>Delete your scores, progress, and Party room membership?</p>
              <button
                className={secondaryButton}
                disabled={deleting}
                onClick={() => {
                  setDeleting(true);
                  setPrivacy('');
                  void gameRequest('/me/delete', {})
                    .then(() => {
                      if (meta.username) savedRoom(meta.username, null);
                      setPrivacy('Game data deleted.');
                      setConfirmDelete(false);
                    })
                    .catch((err) => setPrivacy(gameErrorMessage(err)))
                    .finally(() => setDeleting(false));
                }}
              >
                Delete game data
              </button>
              <button
                className={secondaryButton}
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className={secondaryButton}
              onClick={() => setConfirmDelete(true)}
            >
              Remove my game data
            </button>
          )}
          {privacy && <p role="status">{privacy}</p>}
        </details>
      )}
    </main>
  );
};
