import { writeFileSync } from 'node:fs';
import { loadTestEnv } from './lib/guard';
import { TestClient } from './lib/test-client';
import { FIXTURE_PASSWORD, fixtureEmail } from './lib/fixtures';

interface Target {
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

const BASE_URL = process.env.SCREEN_BASE_URL ?? 'http://localhost:3351';
const DEBUG_PORT = process.env.SCREEN_DEBUG_PORT ?? '9222';

let messageId = 1;

function send(
  ws: WebSocket,
  method: string,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  const id = messageId++;

  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      const msg = JSON.parse(String(event.data)) as { id?: number; result?: unknown };
      if (msg.id === id) {
        ws.removeEventListener('message', onMessage);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function seedSession() {
  const client = new TestClient(BASE_URL);
  const email = fixtureEmail('screens');

  const registered = await client.post('/api/auth/register', {
    name: 'Screenshot User',
    email,
    password: FIXTURE_PASSWORD,
  });

  if (registered.status !== 201) {
    throw new Error(`register failed: ${registered.status} ${registered.raw.slice(0, 200)}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const seeds = [
    { title: 'Finishing Wireframe', startAt: `${today}T09:00:00.000Z` },
    { title: 'Meeting with team', startAt: `${today}T11:00:00.000Z` },
    { title: 'Buy a cat food', startAt: `${today}T13:00:00.000Z` },
    { title: 'Finishing daily commission', startAt: `${today}T15:00:00.000Z` },
  ];

  const ids: string[] = [];
  for (const seed of seeds) {
    const created = await client.post<{ data: { id: string } }>('/api/tasks', seed);
    ids.push(created.body.data.id);
  }

  for (const id of ids.slice(2)) {
    await client.patch(`/api/tasks/${id}/status`, { status: 'COMPLETED' });
  }

  return {
    accessToken: client.getCookie('access_token') as string,
    refreshToken: client.getCookie('refresh_token') as string,
  };
}

async function main() {
  loadTestEnv();
  const path = process.argv[2] ?? '/';
  const outfile = process.argv[3] ?? '/tmp/screen.png';
  const height = Number(process.argv[4] ?? 844);
  const width = Number(process.argv[5] ?? 390);

  const tokens = await seedSession();

  const targets = (await (
    await fetch(`http://localhost:${DEBUG_PORT}/json/list`)
  ).json()) as Target[];
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no chrome page target');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));

  await send(ws, 'Network.enable');
  for (const [name, value] of Object.entries(tokens)) {
    await send(ws, 'Network.setCookie', {
      name: name === 'accessToken' ? 'access_token' : 'refresh_token',
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    });
  }

  await send(ws, 'Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 480,
  });

  await send(ws, 'Page.enable');
  await send(ws, 'Page.navigate', { url: `${BASE_URL}${path}` });
  await new Promise((r) => setTimeout(r, 4000));

  const action = process.env.SCREEN_ACTION;
  if (action) {
    await send(ws, 'Runtime.evaluate', { expression: action, awaitPromise: true });
    await new Promise((r) => setTimeout(r, 2500));
  }

  const shot = (await send(ws, 'Page.captureScreenshot', { format: 'png' })) as { data: string };
  writeFileSync(outfile, Buffer.from(shot.data, 'base64'));
  console.log(`captured ${path} -> ${outfile}`);

  ws.close();
  process.exit(0);
}

void main().catch((error: unknown) => {
  console.error('capture failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
