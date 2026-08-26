import { spawn, type ChildProcess } from 'node:child_process';

export interface RunningServer {
  readonly baseUrl: string;
  stop(): Promise<void>;
}

export async function startTestServer(
  dbName: string,
  port = 3311,
  envOverrides: Record<string, string> = {},
): Promise<RunningServer> {
  if (await isReachable(`http://localhost:${port}`)) {
    throw new Error(
      `Port ${port} is already serving. Stop it first; reusing a foreign server invalidates the run.`,
    );
  }

  const child: ChildProcess = spawn('npx', ['next', 'dev', '--port', String(port)], {
    env: { ...process.env, MONGODB_DB_NAME: dbName, NODE_ENV: 'development', ...envOverrides },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  const logs: string[] = [];
  child.stdout?.on('data', (chunk: Buffer) => logs.push(chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => logs.push(chunk.toString()));

  const baseUrl = `http://localhost:${port}`;

  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    if (await isReachable(baseUrl)) {
      return { baseUrl, stop: () => stopChild(child) };
    }

    if (child.exitCode !== null) {
      throw new Error(`Server exited early (code ${child.exitCode}):\n${logs.join('')}`);
    }

    await delay(400);
  }

  await stopChild(child);
  throw new Error(`Server did not become reachable in time:\n${logs.join('')}`);
}

async function isReachable(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      signal: AbortSignal.timeout(3_000),
    });

    return response.status > 0;
  } catch {
    return false;
  }
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.pid === undefined) return;

  killGroup(child.pid, 'SIGTERM');

  await Promise.race([
    new Promise<void>((resolve) => child.once('exit', () => resolve())),
    delay(6_000),
  ]);

  killGroup(child.pid, 'SIGKILL');
  await delay(300);
}

function killGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // Already gone.
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
