import { useEffect, useState } from 'react';
import type { WstMetaResponse } from '../../../shared/games/who-said-that/contracts';

// Expanded-view start screen. TODO(Phase 2): "Start" begins the 5-round Daily Case flow.
export const StartScreen = () => {
  const [meta, setMeta] = useState<WstMetaResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch('/api/wst/meta')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: WstMetaResponse) => setMeta(data))
      .catch(() => setFailed(true));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg)] px-6 text-center text-[var(--fg)]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
        Daily Case {meta ? `· ${meta.dateKey}` : ''}
      </p>
      <h1 className="text-4xl font-black tracking-tight">Who Said That?</h1>
      <p className="max-w-xs text-base text-[var(--muted)]">
        Read the comment. Pick the subreddit. {meta?.rounds ?? 5} cases a day.
      </p>
      {meta?.usesSampleContent && (
        <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">
          Sample case · fictional comments
        </span>
      )}
      <button
        className="h-12 w-48 rounded-full bg-[var(--accent)] font-semibold text-white disabled:opacity-50"
        disabled
        title="Coming in Phase 2"
      >
        Start case
      </button>
      {failed && <p className="text-sm text-[var(--muted)]">Couldn't reach the server. Try again later.</p>}
    </main>
  );
};
