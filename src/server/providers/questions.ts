import { reddit } from '@devvit/web/server';
import type { QuestionRecord } from '../../shared/games/who-said-that/contracts.ts';
import { buildChoices } from '../games/who-said-that/cases.ts';
import { checkCaseBody, sanitizeCommentBody } from './redditText.ts';

type CaseInput = {
  id: string;
  commentId: `t1_${string}`;
  distractors: string[];
  explanation: string;
};

export type LoadResult =
  | { ok: true; record: QuestionRecord; postId: `t3_${string}` }
  | { ok: false; reason: string; temporary?: boolean };

export async function loadCase(input: CaseInput): Promise<LoadResult> {
  try {
    const comment = await reddit.getCommentById(input.commentId);
    if (!comment || comment.removed || comment.spam)
      return { ok: false, reason: 'Comment removed' };
    const answer = comment.subredditName;
    const body = sanitizeCommentBody(comment.body);
    const check = checkCaseBody(body, answer);
    if (!check.ok)
      return {
        ok: false,
        reason: `Comment fails validation (${check.reason})`,
      };
    const choices = [answer, ...input.distractors];
    if (
      choices.length !== 4 ||
      new Set(choices.map((c) => c.toLowerCase())).size !== 4
    ) {
      return {
        ok: false,
        reason:
          'Choose three different distractors other than the source subreddit',
      };
    }
    const [post, subreddit] = await Promise.all([
      reddit.getPostById(comment.postId),
      reddit.getSubredditByName(answer),
    ]);
    if (
      !post ||
      post.removed ||
      post.spam ||
      post.nsfw ||
      post.removedByCategory ||
      subreddit.type !== 'public' ||
      subreddit.nsfw
    ) {
      return {
        ok: false,
        reason: 'Source must be available in a public SFW subreddit',
      };
    }
    const url = new URL(comment.permalink, 'https://www.reddit.com');
    if (
      url.protocol !== 'https:' ||
      !['www.reddit.com', 'reddit.com'].includes(url.hostname)
    ) {
      return { ok: false, reason: 'Original Reddit link is unavailable' };
    }
    return {
      ok: true,
      postId: comment.postId,
      record: {
        id: input.id,
        body,
        choices: buildChoices(answer, input.distractors, input.id),
        source: 'reddit',
        answerSubreddit: answer,
        threadTitle: sanitizeCommentBody(post.title),
        explanation: sanitizeCommentBody(input.explanation),
        sourceRef: {
          kind: 'reddit',
          commentId: input.commentId,
          permalink: url.href,
        },
      },
    };
  } catch (error) {
    if (
      error instanceof Error &&
      /not found|^no post |permission denied|(^|\D)(403|404|410)(\D|$)/i.test(
        error.message
      )
    ) {
      return { ok: false, reason: 'Source no longer accessible' };
    }
    return {
      ok: false,
      reason: 'Reddit source check unavailable',
      temporary: true,
    };
  }
}
