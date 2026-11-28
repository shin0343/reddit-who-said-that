import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  WST,
  type HintKind,
  type PublicQuestion,
  type RoundResult,
} from '../../../shared/games/who-said-that/contracts';
import type { HintValues } from '../../../shared/games/who-said-that/party';
import { CaseMark } from './Brand';

import { primaryButton, secondaryButton } from './presentation';

export function CaseProgress({
  step,
  total,
  score,
  children,
}: {
  step: number;
  total: number;
  score: number;
  children?: ReactNode;
}) {
  return (
    <div className="case-meter">
      <div className="case-caption">
        <strong>
          {step <= total
            ? `Case File ${String(step).padStart(2, '0')} / ${String(total).padStart(2, '0')}`
            : `${total} files closed`}
        </strong>
        <strong className="tabular-nums">{score} pts</strong>
        {children}
      </div>
      <div className="meter-segments" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            data-step={
              i + 1 < step ? 'past' : i + 1 === step ? 'current' : 'next'
            }
          />
        ))}
      </div>
    </div>
  );
}

const hintKinds: HintKind[] = ['thread-title', 'eliminate-one', 'culture'];

const hintName = (kind: HintKind, fictional: boolean) =>
  kind === 'culture'
    ? 'Culture clue'
    : kind === 'eliminate-one'
      ? 'Eliminate one'
      : fictional
        ? 'Context'
        : 'Thread title';

export function QuestionCard({
  question,
  hints,
  availableHints,
  locked,
  disabled,
  tutorial,
  onGuess,
  onHint,
}: {
  question: PublicQuestion;
  hints: HintValues;
  availableHints: HintKind[];
  locked?: string | null;
  disabled: boolean;
  tutorial?: boolean;
  onGuess: (choice: string) => void;
  onHint: (kind: HintKind) => void;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fictional = question.source === 'fictional';
  const eliminated = hints['eliminate-one'];
  const selected = locked ?? (pick !== eliminated ? pick : null);
  const isSubmitting = submitting && disabled && !locked;
  const used = Object.keys(hints).length;
  const canRevealClue =
    !locked &&
    used < WST.maxHintsPerRound &&
    availableHints.some((kind) => !hints[kind]);

  return (
    <section
      aria-label="Evidence board"
      className="evidence-board"
      aria-busy={isSubmitting}
    >
      <div className="evidence">
        <div className="case-caption">
          <span className="evidence-index">Unknown community</span>
          <span className="case-mode">
            {fictional ? 'Original fictional case' : 'Verified Reddit comment'}
          </span>
        </div>
        <blockquote>{question.body}</blockquote>
      </div>
      <div className="hint-notes grid gap-1.5" aria-live="polite">
        {hintKinds.map(
          (kind) =>
            hints[kind] && (
              <p className="hint-paper" key={kind}>
                <strong>{hintName(kind, fictional)}</strong>{' '}
                {kind === 'eliminate-one'
                  ? `· r/${hints[kind]}`
                  : `· ${hints[kind]}`}
              </p>
            )
        )}
      </div>
      <div>
        <h2 id="suspects-label" className="mb-1.5 font-bold">
          {fictional
            ? 'Which community would say this?'
            : 'Which community did this comment come from?'}
        </h2>
        <div
          className="suspect-grid"
          role="group"
          aria-labelledby="suspects-label"
        >
          {question.choices.map((choice, index) => (
            <button
              key={choice}
              className={`${secondaryButton} suspect`}
              disabled={disabled || !!locked || choice === eliminated}
              aria-pressed={selected === choice}
              onClick={() => {
                setSubmitting(false);
                setPick(choice);
              }}
            >
              <span className="suspect-id" aria-hidden="true">
                {selected === choice ? '✓' : String.fromCharCode(65 + index)}
              </span>
              <span>
                {choice === eliminated ? (
                  <s>r/{choice}</s>
                ) : (
                  <>
                    r/
                    <wbr />
                    {choice}
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
      {!locked && (
        <button
          className={`${primaryButton} lock-action`}
          disabled={!selected || disabled}
          onClick={() => {
            if (!selected) return;
            setSubmitting(true);
            onGuess(selected);
          }}
        >
          {isSubmitting ? 'Locking in…' : 'Lock In'}
        </button>
      )}
      {locked && (
        <p role="status" className="notice">
          Answer locked. Waiting for the reveal.
        </p>
      )}
      {canRevealClue && (
        <details className="border-t border-[var(--line)]">
          <summary className="min-h-11 py-2.5 font-semibold">
            Reveal clue{' '}
            <span className="text-sm font-normal text-[var(--muted)]">
              (−{WST.hintCost} pts per clue on a match)
            </span>
          </summary>
          <div className="hint-actions">
            {availableHints
              .filter((kind) => !hints[kind])
              .map((kind) => (
                <button
                  key={kind}
                  className={secondaryButton}
                  disabled={disabled}
                  onClick={() => {
                    setSubmitting(false);
                    onHint(kind);
                  }}
                >
                  {hintName(kind, fictional)}
                </button>
              ))}
          </div>
        </details>
      )}
      {tutorial && !locked && (
        <p className="case-mode">
          Follow the phrasing. Pick a community, then lock it in.
        </p>
      )}
    </section>
  );
}

function RevealPoints({ points }: { points: number }) {
  const [animate] = useState(
    () =>
      points > 0 &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [display, setDisplay] = useState(animate ? 0 : points);

  useEffect(() => {
    if (!animate) return;
    const start = performance.now();
    let frame: number;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 320);
      setDisplay(Math.round(points * Math.max(0, progress)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, points]);

  return (
    <p className="reveal-points" data-points={points}>
      <span className="sr-only">+{points} points</span>
      <span aria-hidden="true">+{display} pts</span>
    </p>
  );
}

export const RevealCard = ({
  result,
  pick,
  counts,
  fictional = false,
  hintsUsed = [],
  children,
}: {
  fictional?: boolean;
  result: Omit<RoundResult, 'distribution'> & {
    distribution?: RoundResult['distribution'];
  };
  pick: string | null;
  counts?: Record<string, number> | undefined;
  hintsUsed?: HintKind[] | undefined;
  children?: ReactNode;
}) => (
  <section
    aria-label="Round reveal"
    className="report-sheet reveal-file"
    data-correct={result.correct}
  >
    <p className="reveal-stamp" role="status">
      {result.correct ? 'CASE SOLVED!' : 'WRONG LEAD!'}
    </p>
    <div>
      <p className="case-mode">
        {fictional ? 'Intended community' : 'Original Reddit community'}
      </p>
      <h2>
        r/
        <wbr />
        {result.answerSubreddit}
      </h2>
    </div>
    <p className="wrap-text">{result.explanation}</p>
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--line)] pt-2">
      <p className="wrap-text">
        {pick === null ? 'Time ran out' : <>Your pick · r/{pick}</>}
      </p>
      <RevealPoints points={result.points} />
    </div>
    <p className="case-mode">
      {hintsUsed.length
        ? `Clues used · ${hintsUsed.map((kind) => hintName(kind, fictional)).join(', ')} (−${WST.hintCost * hintsUsed.length} pts on a match)`
        : 'Clues used · none'}
    </p>
    {children}
    {result.distribution && (
      <ChoiceDistribution
        distribution={result.distribution}
        answer={result.answerSubreddit}
        counts={counts}
      />
    )}
  </section>
);

export const ChoiceDistribution = ({
  distribution,
  answer,
  counts,
}: {
  distribution: Record<string, number>;
  answer: string;
  counts?: Record<string, number> | undefined;
}) => (
  <ul className="grid gap-2 text-sm" aria-label="Choice distribution">
    {Object.entries(distribution).map(([choice, fraction]) => (
      <li key={choice}>
        <div className="mb-1 flex justify-between gap-2">
          <span className="wrap-text">
            r/{choice}
            {choice === answer && (
              <span aria-label="Correct community"> ✓</span>
            )}
          </span>
          <span className="shrink-0 tabular-nums">
            {counts && `${counts[choice] ?? 0} · `}
            {Math.round(fraction * 100)}%
          </span>
        </div>
        <progress
          aria-label={`r/${choice} share`}
          className="distribution-track"
          max={1}
          value={fraction}
        />
      </li>
    ))}
  </ul>
);

function useScreenHeading(phaseKey: string | undefined) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [phaseKey]);
  return heading;
}

export function GameFrame({
  title,
  onHome,
  phaseKey,
  children,
}: {
  title: string;
  onHome: () => void;
  phaseKey?: string;
  children: ReactNode;
}) {
  const heading = useScreenHeading(phaseKey);
  return (
    <main className="game-frame screen-enter">
      <header className="frame-head">
        <div className="frame-brand">
          <CaseMark />
          <h1 ref={heading} tabIndex={-1}>
            {title}
          </h1>
        </div>
        <button className={`${secondaryButton} text-sm`} onClick={onHome}>
          Home
        </button>
      </header>
      {children}
    </main>
  );
}
