// Pure text helpers for Reddit comment content. No Devvit imports, so they run under `node --test`.

/** Comment length window for a playable case (after sanitizing). See docs/ARCHITECTURE.md §6. */
export const COMMENT_MIN_CHARS = 40;
export const COMMENT_MAX_CHARS = 400;

/**
 * Accepts a comment ID (`t1_abc123` or `abc123`) or a Reddit comment URL and returns `t1_<id>`.
 * Returns null for anything else (e.g. `/s/` share short-links, which hide the comment ID).
 */
export const parseCommentRef = (input: string): `t1_${string}` | null => {
  const s = input.trim();
  const bare = /^(?:t1_)?([a-z0-9]{3,16})$/i.exec(s);
  if (bare) return `t1_${bare[1]!.toLowerCase()}`;
  // New share format: /r/sub/comments/<post>/comment/<comment>/
  const shareUrl = /\/comments\/[a-z0-9]+\/comment\/([a-z0-9]+)/i.exec(s);
  if (shareUrl) return `t1_${shareUrl[1]!.toLowerCase()}`;
  // Classic permalink: /r/sub/comments/<post>/<slug>/<comment>/
  const permalink = /\/comments\/[a-z0-9]+\/[^/?#]+\/([a-z0-9]+)/i.exec(s);
  if (permalink) return `t1_${permalink[1]!.toLowerCase()}`;
  return null;
};

/**
 * Makes a comment safe to show anonymously: no usernames, links or subreddit names
 * (a subreddit name would leak the answer), and no markdown noise.
 */
export const sanitizeCommentBody = (raw: string): string =>
  raw
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)/g, '$1') // [text](url) -> text
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[link]')
    .replace(/(^|[^a-z0-9_/])\/?u\/[a-z0-9_-]+/gi, '$1[user]')
    .replace(/(^|[^a-z0-9_/])\/?r\/[a-z0-9_]+/gi, '$1[sub]')
    .replace(/^\s*>+\s?/gm, '') // quote markers
    .replace(/^\s*#{1,6}\s+/gm, '') // headings
    .replace(/(\*\*|__|~~|>!|!<|\^)/g, '') // bold, strike, spoiler, superscript
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x200B;/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

export type BodyCheck = { ok: true } | { ok: false; reason: 'too-short' | 'too-long' | 'deleted' | 'mentions-answer' };

/** Checks an already-sanitized body against the case rules. */
export const checkCaseBody = (body: string, answerSubreddit: string): BodyCheck => {
  if (body === '[deleted]' || body === '[removed]' || body === '') return { ok: false, reason: 'deleted' };
  if (body.length < COMMENT_MIN_CHARS) return { ok: false, reason: 'too-short' };
  if (body.length > COMMENT_MAX_CHARS) return { ok: false, reason: 'too-long' };
  if (mentionsSubreddit(body, answerSubreddit)) return { ok: false, reason: 'mentions-answer' };
  return { ok: true };
};

export const mentionsSubreddit = (text: string, subreddit: string): boolean => {
  const escaped = subreddit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
};
