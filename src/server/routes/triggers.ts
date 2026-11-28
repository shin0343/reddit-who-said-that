import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnCommentDeleteRequest,
  OnPostDeleteRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { legacyCaseIds } from '../services/contentMaintenance.ts';
import { withdrawContent } from '../services/contentBank.ts';
import { createPost } from '../core/post.ts';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createPost();
    const input = await c.req.json<OnAppInstallRequest>();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Post created in subreddit ${context.subredditName} with id ${post.id} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});

triggers.post('/comment-delete', async (c) => {
  const { commentId } = await c.req.json<OnCommentDeleteRequest>();
  if (!/^t1_[a-z0-9]+$/.test(commentId))
    return c.json({ status: 'error' }, 400);
  await withdrawContent(
    redis,
    commentId,
    'Deleted or removed',
    Date.now(),
    legacyCaseIds(commentId)
  );
  return c.json({ status: 'success' });
});

triggers.post('/post-delete', async (c) => {
  const { postId } = await c.req.json<OnPostDeleteRequest>();
  if (!/^t3_[a-z0-9]+$/.test(postId)) return c.json({ status: 'error' }, 400);
  await withdrawContent(redis, postId, 'Thread deleted or removed');
  return c.json({ status: 'success' });
});
