import { navigateTo } from '@devvit/web/client';
import { useEffect, useState } from 'react';
import {
  WST,
  type DailyAction,
  type DailyProgress,
} from '../../../shared/games/who-said-that/contracts';
import { CaseProgress, GameFrame, QuestionCard, RevealCard } from './CaseCards';
import { modeName, primaryButton, secondaryButton } from './presentation';
import { DailyResults } from './DailyResults';
import { gameErrorMessage, gameRequest } from './api';

export const DailyScreen = ({
  onHome,
  practice = false,
  onDaily,
  onParty,
}: {
  onHome: () => void;
  practice?: boolean;
  onDaily?: () => void;
  onParty?: (() => void) | undefined;
}) => {
  const path = practice ? '/daily/practice' : '/daily/play';
  const [state, setState] = useState<DailyProgress | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void gameRequest<DailyProgress>(path, { type: 'open' }, controller.signal)
      .then(setState)
      .catch((err) => {
        if (!controller.signal.aborted) setError(gameErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [path]);

  const act = async (action: DailyAction) => {
    setBusy(true);
    setError('');
    try {
      setState(await gameRequest<DailyProgress>(path, action));
    } catch (err) {
      setError(gameErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const question = state?.question;
  const reveal = state?.reveal;
  return (
    <GameFrame
      title={practice ? 'Tutorial' : 'Daily Case'}
      onHome={onHome}
      phaseKey={
        reveal
          ? `reveal-${reveal.questionId}`
          : (question?.id ?? (state?.finished ? 'results' : 'opening'))
      }
    >
      {busy && !state && (
        <p className="notice" role="status">
          Opening the case file…
        </p>
      )}
      {error && (
        <div className="notice flex flex-wrap items-center justify-between gap-2">
          <p role="alert">{error}</p>
          <button
            className={secondaryButton}
            disabled={busy}
            onClick={() => void act({ type: 'open' })}
          >
            Reload case
          </button>
        </div>
      )}
      {state && (
        <>
          {(question || reveal) && (
            <>
              <p className="case-mode">
                {question
                  ? modeName(question.source === 'fictional')
                  : modeName(state.pack.mode === 'fictional')}
                {practice && ' · Unranked'}
              </p>
              <CaseProgress
                step={state.round + 1}
                total={WST.roundsPerDaily}
                score={state.total}
              />
            </>
          )}
          {!practice && state.pack.mode === 'practice' && (
            <p className="notice">
              {state.pack.withdrawn
                ? 'A case was withdrawn. Today’s run is now unranked.'
                : 'Today has fewer than five approved cases. Play an unranked run.'}
            </p>
          )}
          {reveal ? (
            <>
              <RevealCard
                key={reveal.questionId}
                result={reveal}
                hintsUsed={reveal.hintsUsed}
                pick={reveal.pick}
                fictional={question?.source === 'fictional'}
              >
                {practice && state.round === 0 && (
                  <p className="notice text-sm">
                    A match earns {WST.baseCorrectPoints} points plus a speed
                    bonus. Each clue costs {WST.hintCost} points.
                  </p>
                )}
              </RevealCard>
              {reveal.permalink && (
                <button
                  className={secondaryButton}
                  onClick={() => navigateTo(reveal.permalink ?? '')}
                >
                  View original discussion
                </button>
              )}
              <button
                className={primaryButton}
                disabled={busy}
                onClick={() =>
                  void act({
                    type: 'next',
                    dateKey: state.dateKey,
                    questionId: reveal.questionId,
                  })
                }
              >
                {state.round + 1 < WST.roundsPerDaily
                  ? 'Next case'
                  : 'See results'}
              </button>
            </>
          ) : question ? (
            <QuestionCard
              key={question.id}
              tutorial={practice && state.round === 0}
              question={question}
              hints={state.hints}
              availableHints={state.availableHints}
              disabled={busy}
              onGuess={(choice) =>
                void act({
                  type: 'guess',
                  dateKey: state.dateKey,
                  questionId: question.id,
                  choice,
                })
              }
              onHint={(kind) =>
                void act({
                  type: 'hint',
                  dateKey: state.dateKey,
                  questionId: question.id,
                  kind,
                })
              }
            />
          ) : (
            <DailyResults
              practice={practice}
              state={state}
              busy={busy}
              onDaily={onDaily}
              onParty={onParty}
              onReload={() => void act({ type: 'open' })}
            />
          )}
        </>
      )}
    </GameFrame>
  );
};
