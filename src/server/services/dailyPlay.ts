import type { DailyBrief } from '../../shared/games/who-said-that/community.ts';
import type {
  DailyAction,
  DailyProgress,
  DailyResult,
  HintKind,
  QuestionRecord,
} from '../../shared/games/who-said-that/contracts.ts';
import { publicQuestionId, toPublic } from '../games/who-said-that/cases.ts';
import {
  availableHint,
  availableHints,
  resolveRound,
} from '../games/who-said-that/round.ts';
import {
  dailyKey,
  readQuestion,
  snapshotKey,
  type StoredPack,
} from './contentBank.ts';
import type { Daily } from './daily.ts';
import { dayOffset, expiryForDay, todayKey } from './dateKey.ts';
import { type BoardShard, playerShard, playKey } from './leaderboard.ts';
import {
  GameError,
  type GameStore,
  jsonWrite,
  readJson,
  withWatchedKeys,
} from './watched.ts';

type Outcome = { correct: boolean; points: number; choice?: string };
type Play = {
  round: number;
  issuedAt: number;
  issuedQuestionId: string | null;
  hints: HintKind[];
  results: (Outcome | null)[];
  reveal: { questionId: string; pick: string } | null;
  finishedAt?: number;
};
const newPlay = (): Play => ({
  round: 0,
  issuedAt: 0,
  issuedQuestionId: null,
  hints: [],
  results: [],
  reveal: null,
});

function renderReveal(
  question: QuestionRecord,
  play: Play
): DailyResult | null {
  const outcome = play.results[play.round];
  if (play.reveal?.questionId !== question.id || !outcome) return null;
  return {
    questionId: publicQuestionId(question),
    correct: outcome.correct,
    points: outcome.points,
    answerSubreddit: question.answerSubreddit,
    explanation: question.explanation,
    pick: play.reveal.pick,
    hintsUsed: play.hints,
    ...(question.sourceRef.kind === 'reddit' && {
      permalink: question.sourceRef.permalink,
    }),
  };
}

export async function readDailyProgress(
  store: GameStore,
  dateKey: string,
  uid: string
) {
  const play = await readJson<Play>(store, playKey(dateKey, uid));
  const progress = play?.finishedAt
    ? 'finished'
    : play?.issuedQuestionId || play?.round
      ? 'in-progress'
      : 'new';
  return { progress, round: play?.round ?? 0 } satisfies Pick<
    DailyBrief,
    'progress' | 'round'
  >;
}

export async function playDaily(
  store: GameStore,
  uid: string,
  daily: Daily,
  action: DailyAction,
  clock = Date.now
): Promise<DailyProgress> {
  const { dateKey, pack } = daily;
  if (action.type !== 'open' && action.dateKey !== dateKey) {
    throw new GameError('A new Daily Case is available. Reload the case.');
  }
  const key = playKey(dateKey, uid, daily.tutorial);
  const packKey = dailyKey(dateKey);
  const boardKey = playerShard(
    dateKey,
    uid,
    pack.mode === 'fictional' ? 'fictional' : 'official'
  );
  const expiresAt = expiryForDay(dateKey);
  const sourceKeys = daily.questions.flatMap((q) =>
    q?.source === 'reddit' ? [snapshotKey(q.id)] : []
  );
  return withWatchedKeys<DailyProgress>(
    store,
    action.type === 'next'
      ? [key, packKey, boardKey, ...sourceKeys]
      : [key, packKey, ...sourceKeys],
    async () => {
      const [saved, currentPack] = await Promise.all([
        readJson<Play>(store, key),
        readJson<StoredPack>(store, packKey),
      ]);
      const now = clock();
      if (todayKey(new Date(now)) !== dateKey)
        throw new GameError('A new Daily Case is available. Reload the case.');
      if (pack.mode !== 'practice' && currentPack?.mode !== pack.mode) {
        throw new GameError('A case was withdrawn. Reload the case.');
      }
      const play = saved ?? newPlay();
      let changed = false;
      // Drop legacy stored reveal metadata. The live question snapshot supplies the source link.
      if (play.reveal && Object.keys(play.reveal).length > 2) {
        play.reveal = {
          questionId: play.reveal.questionId,
          pick: play.reveal.pick,
        };
        changed = true;
      }
      const shown = daily.questions[play.round];
      const matches =
        action.type !== 'open' &&
        !!shown &&
        action.questionId === publicQuestionId(shown);
      if (
        action.type === 'next' &&
        matches &&
        play.reveal?.questionId === shown.id
      ) {
        play.round++;
        play.reveal = null;
        changed = true;
      }
      while (
        play.round < daily.questions.length &&
        !daily.questions[play.round]
      ) {
        play.results[play.round++] = null;
        play.reveal = null;
        changed = true;
      }
      const question = daily.questions[play.round];
      if (
        question?.source === 'reddit' &&
        !(await readQuestion(store, question.id))
      ) {
        throw new GameError('A case was withdrawn. Reload the case.');
      }
      if (!play.reveal && question) {
        const issued = play.issuedQuestionId === question.id;
        if (!issued) {
          play.issuedQuestionId = question.id;
          play.issuedAt = now;
          play.hints = [];
          changed = true;
        }
        if (
          action.type === 'hint' &&
          matches &&
          !play.hints.includes(action.kind)
        ) {
          if (!availableHint(question, action.kind))
            throw new GameError('This hint is unavailable.', 400);
          play.hints.push(action.kind);
          changed = true;
        }
        if (action.type === 'guess' && issued && matches) {
          if (!question.choices.includes(action.choice))
            throw new GameError('Invalid choice.', 400);
          const result = resolveRound(
            question,
            action.choice,
            play.hints,
            now - play.issuedAt
          );
          play.results[play.round] = {
            correct: result.correct,
            points: result.points,
            choice: action.choice,
          };
          play.reveal = { questionId: question.id, pick: action.choice };
          changed = true;
        }
      }
      const outcomes = play.results.map((result, i) =>
        daily.questions[i] ? (result?.correct ?? null) : null
      );
      const total = play.results.reduce(
        (sum, result, i) =>
          sum + (daily.questions[i] ? (result?.points ?? 0) : 0),
        0
      );
      const finished = play.round >= daily.questions.length;
      const writes = [];
      if (finished && !play.finishedAt) {
        play.finishedAt = now;
        changed = true;
        const choices = daily.questions.flatMap(
          (_, i) => play.results[i]?.choice ?? []
        );
        if (
          action.type === 'next' &&
          pack.mode !== 'practice' &&
          choices.length === daily.questions.length
        ) {
          if (pack.mode === 'official') {
            const remaining = await Promise.all(
              daily.qids.map((id) => readQuestion(store, id))
            );
            if (!remaining.every(Boolean))
              throw new GameError('A case was withdrawn. Reload the case.');
          }
          const scores = (await readJson<BoardShard>(store, boardKey)) ?? {};
          if (!scores[uid]) {
            scores[uid] = {
              score: total,
              correct: outcomes.filter(Boolean).length,
              at: now,
              choices,
            };
            writes.push(jsonWrite(boardKey, scores, expiresAt));
          }
        }
      }
      if (changed) writes.push(jsonWrite(key, play, expiresAt));
      const hints: DailyProgress['hints'] = {};
      if (question && !play.reveal)
        for (const kind of play.hints)
          hints[kind] = availableHint(question, kind);
      return {
        value: {
          dateKey,
          pack,
          round: play.round,
          finished,
          serverNow: now,
          nextDailyAt: Date.parse(dayOffset(dateKey, 1)),
          question: question ? toPublic(question) : null,
          hints,
          availableHints:
            question && !play.reveal ? availableHints(question) : [],
          reveal: question ? renderReveal(question, play) : null,
          total,
          outcomes,
          community: null,
        },
        writes,
      };
    }
  );
}
