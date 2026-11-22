import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StartScreen } from './games/who-said-that/StartScreen';

// Expanded view. Only one game today; when a second game ships, pick it from post data here.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StartScreen />
  </StrictMode>
);
