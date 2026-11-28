import type {
  HintKind,
  QuestionRecord,
  RoundResult,
} from '../../../shared/games/who-said-that/contracts.ts';
import { mentionsSubreddit } from '../../providers/redditText.ts';
import { scoreRound } from './scoring.ts';

export const isHint = (value: unknown): value is HintKind =>
  value === 'thread-title' || value === 'eliminate-one' || value === 'culture';

export const availableHint = (
  question: QuestionRecord,
  kind: HintKind
): string | undefined => {
  if (kind === 'thread-title') {
    const title = question.threadTitle;
    return !title ||
      title === '[deleted]' ||
      title === '[removed]' ||
      mentionsSubreddit(title, question.answerSubreddit)
      ? undefined
      : title;
  }
  if (kind === 'culture') {
    return question.cultureHint &&
      !mentionsSubreddit(question.cultureHint, question.answerSubreddit)
      ? question.cultureHint
      : undefined;
  }
  if (question.cultureHint) return undefined;
  return question.choices.find((choice) => choice !== question.answerSubreddit);
};

const HINT_KINDS: readonly HintKind[] = [
  'thread-title',
  'eliminate-one',
  'culture',
];

export const availableHints = (question: QuestionRecord) =>
  HINT_KINDS.filter((kind) => availableHint(question, kind) !== undefined);

export const resolveRound = (
  question: QuestionRecord,
  choice: string | null,
  hintsUsed: readonly HintKind[],
  elapsedMs: number
): Omit<RoundResult, 'distribution'> => {
  const correct = choice === question.answerSubreddit;
  return {
    questionId: question.id,
    correct,
    answerSubreddit: question.answerSubreddit,
    points: scoreRound({ correct, hintsUsed, elapsedMs }),
    explanation: question.explanation,
  };
};

export const voteDistribution = (
  choices: string[],
  counts: Record<string, number>
) => {
  const tally = choices.map<[string, number]>((choice) => [
    choice,
    Object.hasOwn(counts, choice) ? (counts[choice] ?? 0) : 0,
  ]);
  const total = tally.reduce((sum, [, count]) => sum + count, 0);
  return Object.fromEntries(
    tally.map(([choice, count]) => [choice, total ? count / total : 0])
  );
};
