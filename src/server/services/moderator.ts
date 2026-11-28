import { context, reddit } from '@devvit/web/server';
import { GameError } from './watched.ts';

export async function isModerator() {
  if (!context.userId || !context.subredditName) return false;
  const username = await reddit.getCurrentUsername();
  if (!username) return false;
  const moderators = await reddit
    .getModerators({
      subredditName: context.subredditName,
      username,
      limit: 1,
    })
    .all();
  return moderators.some((moderator) => moderator.id === context.userId);
}

export async function requireModerator() {
  if (!(await isModerator()))
    throw new GameError('Moderator access required.', 403);
}
