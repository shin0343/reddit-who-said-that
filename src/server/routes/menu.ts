import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { requireModerator } from '../services/moderator.ts';
import { GameError } from '../services/watched.ts';
import { createPost } from '../core/post.ts';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    await requireModerator();
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://www.reddit.com${post.permalink}`,
      },
      200
    );
  } catch (error) {
    if (error instanceof GameError)
      return c.json<UiResponse>({ showToast: error.message }, error.status);
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});
