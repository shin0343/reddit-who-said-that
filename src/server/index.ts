import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { wstRoutes } from './games/who-said-that/routes.ts';
import { menu } from './routes/menu.ts';
import { triggers } from './routes/triggers.ts';

const app = new Hono();
const api = new Hono();
const internal = new Hono();

// Public client API: one sub-router per game. New game => add `api.route('/<game>', ...)`.
api.route('/wst', wstRoutes);

// Reddit-invoked endpoints (menu, triggers, scheduler). Must live under /internal.
internal.route('/menu', menu);
internal.route('/triggers', triggers);

app.route('/api', api);
app.route('/internal', internal);

serve({
  fetch: app.fetch,
  createServer,
  port: getServerPort(),
});
