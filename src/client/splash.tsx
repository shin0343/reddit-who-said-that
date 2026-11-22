import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Inline (feed) view. Keep it light: no data fetching beyond what the hook needs.
// TODO(Phase 2): show today's streak / "solved 3 of 5" from a cheap endpoint.
export const Splash = () => (
  <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)] px-6 text-center text-[var(--fg)]">
    <h1 className="text-3xl font-black tracking-tight">Who Said That?</h1>
    <p className="max-w-xs text-sm text-[var(--muted)]">One comment. Four subreddits. Can you tell which community wrote it?</p>
    <button
      className="h-11 rounded-full bg-[var(--accent)] px-6 font-semibold text-white"
      onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
    >
      Open today's case
    </button>
  </main>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
