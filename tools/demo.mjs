import { AsyncLocalStorage } from 'node:async_hooks';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { Hono } from 'hono';

const port = 4173;
const home = `http://127.0.0.1:${port}`;
const files = new URL('../dist/client/', import.meta.url);
const player = new AsyncLocalStorage();
const rows = new Map();
const listeners = new Set();

function existing(key) {
  const row = rows.get(key);
  if (row && row.expiresAt <= Date.now()) {
    rows.delete(key);
    return undefined;
  }
  return row;
}

function save(key, value, options = {}) {
  if (options.nx && existing(key)) return '';
  rows.set(key, {
    value,
    expiresAt: options.expiration?.getTime() ?? Infinity,
  });
  return 'OK';
}

const redis = {
  get: async (key) => existing(key)?.value,
  mGet: async (keys) => keys.map((key) => existing(key)?.value ?? null),
  set: async (...args) => save(...args),
  async watch(...keys) {
    const before = keys.map(existing);
    const queued = [];
    return {
      async multi() {},
      async set(...args) {
        queued.push(() => save(...args));
      },
      async del(...keysToRemove) {
        queued.push(
          () => keysToRemove.filter((key) => rows.delete(key)).length
        );
      },
      async exec() {
        if (keys.some((key, i) => existing(key) !== before[i])) return [];
        return queued.map((command) => command());
      },
      async unwatch() {},
      async discard() {
        queued.length = 0;
      },
    };
  },
};

// Substitute the Devvit capability boundary only in the localhost process.
const mockUrl = 'wst-local-demo:devvit';
globalThis.wstDemo = {
  context: {
    get userId() {
      return `t2_demo_${player.getStore()}`;
    },
    subredditName: 'LocalDemo',
  },
  reddit: {
    getCurrentUsername: async () => player.getStore(),
    getModerators: () => ({
      all: async () =>
        player.getStore() === 'alice' &&
        process.env.WST_DEMO_MODERATOR === 'alice'
          ? [{ id: 't2_demo_alice' }]
          : [],
    }),
    async getCommentById() {
      throw new Error('not found');
    },
  },
  redis,
  settings: { get: async () => true },
  realtime: {
    async send(channel, message) {
      for (const listener of listeners)
        listener.write(`data: ${JSON.stringify({ channel, message })}\n\n`);
    },
  },
};
registerHooks({
  resolve(specifier, context, next) {
    return specifier === '@devvit/web/server'
      ? { url: mockUrl, shortCircuit: true }
      : next(specifier, context);
  },
  load(url, context, next) {
    if (url !== mockUrl) return next(url, context);
    return {
      format: 'module',
      shortCircuit: true,
      source:
        'export const { context, reddit, redis, settings, realtime } = globalThis.wstDemo;',
    };
  },
});

const { wstRoutes } =
  await import('../src/server/games/who-said-that/routes.ts');
const app = new Hono();
app.route('/api/wst', wstRoutes);
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css' };
const bridge = await readFile(new URL('./demo-client.js', import.meta.url));

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', home);
    if (url.pathname === '/demo-events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
      });
      res.write(': localhost demo\n\n');
      listeners.add(res);
      res.on('close', () => listeners.delete(res));
      return;
    }
    if (url.pathname === '/demo-client.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      res.end(bridge);
      return;
    }
    if (url.pathname.startsWith('/api/wst/')) {
      const name = req.headers['x-demo-player'];
      const identity =
        typeof name === 'string' && /^[a-z][a-z0-9_-]{0,23}$/i.test(name)
          ? name.toLowerCase()
          : 'alice';
      const body = [];
      for await (const chunk of req) body.push(chunk);
      const response = await player.run(identity, () =>
        app.request(url, {
          method: req.method,
          headers: req.headers,
          body: body.length ? Buffer.concat(body) : undefined,
        })
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const file = url.pathname === '/' ? 'game.html' : url.pathname.slice(1);
    if (!/^[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/i.test(file)) {
      res.writeHead(404).end();
      return;
    }
    const buffer = await readFile(new URL(file, files));
    res.writeHead(200, {
      'Content-Type':
        mime[file.split('.').at(-1)] ?? 'application/octet-stream',
    });
    res.end(
      file === 'game.html'
        ? buffer
            .toString()
            .replace('<head>', '<head><script src="/demo-client.js"></script>')
        : buffer
    );
  } catch (error) {
    if (error.code === 'ENOENT') res.writeHead(404).end();
    else {
      console.error('[local demo]', error);
      res.writeHead(500).end();
    }
  }
}).listen(port, '127.0.0.1', () => {
  console.log(
    `Who Said That? local demo — ${home}/?player=alice and ${home}/?player=bob\nProgress lives in this demo process.`
  );
});
