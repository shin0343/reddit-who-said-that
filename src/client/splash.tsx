import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AgencyHero } from './games/who-said-that/Brand';

export const Splash = () => (
  <main className="splash-frame">
    <AgencyHero />
    <p className="text-[var(--muted)]">
      Read the comment. Guess its community.
    </p>
    <button
      className="game-button button-primary"
      onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
    >
      Open today’s case
    </button>
  </main>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
