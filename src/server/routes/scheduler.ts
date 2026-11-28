import { Hono } from 'hono';
import {
  loadDaily,
  prepareTomorrow,
  sweepContent,
} from '../services/contentMaintenance.ts';
import { todayKey } from '../services/dateKey.ts';

export const schedulerRoutes = new Hono();
schedulerRoutes.onError((error, c) => {
  console.error('[wst] scheduled maintenance failed', error);
  return c.json({ status: 'error' }, 503);
});
schedulerRoutes.post('/daily', async (c) => {
  await loadDaily(todayKey());
  return c.json({ status: 'ok' });
});
schedulerRoutes.post('/prepare', async (c) => {
  await prepareTomorrow();
  return c.json({ status: 'ok' });
});
schedulerRoutes.post('/sweep', async (c) =>
  c.json({ status: 'ok', ...(await sweepContent()) })
);
