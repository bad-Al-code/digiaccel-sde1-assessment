import { spawn } from 'node:child_process';
import { loadTestEnv } from './lib/guard';
import { Reporter } from './lib/reporter';

const NON_ROUTABLE_URI = 'mongodb://10.255.255.1:27017/?connectTimeoutMS=2000';

async function runChild(scenario: string): Promise<void> {
  const { database } = await import('../src/server/database/connection');

  switch (scenario) {
    case 'happy': {
      const first = await database.connect();
      const second = await database.connect();
      const concurrent = await Promise.all([database.connect(), database.connect()]);

      report({
        singleton: first === second,
        concurrentShareOne: concurrent[0] === first && concurrent[1] === first,
        connected: database.isConnected(),
        readyState: database.readyState,
      });

      await database.disconnect();
      report({ disconnected: !database.isConnected() });

      const reconnected = await database.connect();
      report({ reconnects: reconnected !== null && database.isConnected() });
      await database.disconnect();
      break;
    }

    case 'unreachable': {
      const firstError = await captureError(() => database.connect());

      const startedSecond = Date.now();
      const secondError = await captureError(() => database.connect());
      const secondDurationMs = Date.now() - startedSecond;

      report({
        firstMessage: firstError,
        secondAttemptAlsoErrors: secondError.length > 0,
        secondDurationMs,
        cacheClearedForRetry: secondDurationMs > 500,
        bothMentionAllowlist: /allowlist/i.test(firstError) && /allowlist/i.test(secondError),
        mentionsAllowlist: /allowlist|paused/i.test(firstError),
        leaksNoCredentials: !containsSecret(firstError),
      });
      break;
    }

    case 'badauth': {
      const message = await captureError(() => database.connect());

      report({
        message,
        mentionsCredentials: /credential|percent-encoded/i.test(message),
        leaksNoPassword: !containsSecret(message),
      });
      break;
    }

    case 'buffering': {
      const { TaskModel } = await import('../src/server/database/models/task.model');
      const started = Date.now();
      const message = await captureError(() => TaskModel.findOne({}).exec());

      report({
        failedFast: Date.now() - started < 5_000,
        errored: message.length > 0,
        message: message.slice(0, 90),
      });
      break;
    }

    default:
      report({ error: `unknown scenario ${scenario}` });
  }
}

/**
 * Reads the live credentials from the environment rather than hardcoding them,
 * so no fragment of a real secret is ever committed.
 */
function containsSecret(message: string): boolean {
  const uri = process.env.MONGODB_URI ?? '';
  const credentials = /:\/\/([^:]+):([^@]+)@/.exec(uri);
  const candidates = [credentials?.[1], credentials?.[2], 'mongodb+srv'].filter(
    (value): value is string => typeof value === 'string' && value.length > 3,
  );

  return candidates.some((value) => message.toLowerCase().includes(value.toLowerCase()));
}

function report(payload: Record<string, unknown>): void {
  console.log(`__RESULT__${JSON.stringify(payload)}`);
}

async function captureError(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function spawnScenario(
  scenario: string,
  env: Record<string, string>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['tsx', 'scripts/test-db-connection.ts', scenario], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));

    child.on('exit', () => {
      const merged: Record<string, unknown> = {};

      for (const line of output.split('\n')) {
        const index = line.indexOf('__RESULT__');
        if (index === -1) continue;
        try {
          Object.assign(merged, JSON.parse(line.slice(index + '__RESULT__'.length)));
        } catch {
          // ignore malformed line
        }
      }

      merged.__raw = output;
      resolve(merged);
    });
  });
}

async function runParent(): Promise<void> {
  const { uri, dbName } = loadTestEnv();
  const reporter = new Reporter();

  console.log('\nMongoDB connection edge cases');
  console.log(`  database: ${dbName}`);

  reporter.group('Successful connection');
  const happy = await spawnScenario('happy', { MONGODB_URI: uri, MONGODB_DB_NAME: dbName });
  reporter.ok('connects to Atlas', happy.connected === true);
  reporter.equal('readyState is 1 (connected)', happy.readyState, 1);
  reporter.ok('repeated connect returns one instance', happy.singleton === true);
  reporter.ok('concurrent connects share one promise', happy.concurrentShareOne === true);
  reporter.ok('disconnect closes the connection', happy.disconnected === true);
  reporter.ok('reconnects after disconnect', happy.reconnects === true);

  reporter.group('Unreachable host');
  const unreachable = await spawnScenario('unreachable', {
    MONGODB_URI: NON_ROUTABLE_URI,
    MONGODB_DB_NAME: dbName,
  });
  reporter.ok('connect rejects', String(unreachable.firstMessage ?? '').length > 0);
  reporter.ok('names the IP allowlist as likely cause', unreachable.mentionsAllowlist === true);
  reporter.ok(
    `retry re-attempts rather than returning a cached rejection (${String(unreachable.secondDurationMs)}ms)`,
    unreachable.cacheClearedForRetry === true,
  );
  reporter.ok('both attempts give the same diagnosis', unreachable.bothMentionAllowlist === true);
  reporter.ok(
    'second attempt still errors rather than hanging',
    unreachable.secondAttemptAlsoErrors === true,
  );
  reporter.ok('error leaks no connection string', unreachable.leaksNoCredentials === true);

  reporter.group('Bad credentials');
  const badAuth = await spawnScenario('badauth', {
    MONGODB_URI: uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:wrongpassword@'),
    MONGODB_DB_NAME: dbName,
  });
  reporter.ok('names credentials or encoding', badAuth.mentionsCredentials === true);
  reporter.ok('error leaks no password', badAuth.leaksNoPassword === true);

  reporter.group('bufferCommands disabled');
  const buffering = await spawnScenario('buffering', {
    MONGODB_URI: uri,
    MONGODB_DB_NAME: dbName,
  });
  reporter.ok('query while disconnected errors', buffering.errored === true);
  reporter.ok('fails fast rather than queueing', buffering.failedFast === true);

  reporter.group('Environment validation');
  const badUri = await spawnScenario('happy', {
    MONGODB_URI: 'postgres://nope',
    MONGODB_DB_NAME: dbName,
  });
  reporter.ok(
    'non-mongo URI rejected at boot',
    /MONGODB_URI must start with/.test(String(badUri.__raw ?? '')),
  );

  const shortSecret = await spawnScenario('happy', {
    MONGODB_URI: uri,
    MONGODB_DB_NAME: dbName,
    JWT_ACCESS_SECRET: 'tooshort',
  });
  reporter.ok(
    'short JWT secret rejected at boot',
    /at least 32 characters/.test(String(shortSecret.__raw ?? '')),
  );

  const sameSecret = await spawnScenario('happy', {
    MONGODB_URI: uri,
    MONGODB_DB_NAME: dbName,
    JWT_ACCESS_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'a'.repeat(40),
  });
  reporter.ok(
    'identical JWT secrets rejected at boot',
    /must differ/.test(String(sameSecret.__raw ?? '')),
  );

  reporter.summary('MongoDB connection');
}

const scenario = process.argv[2];

if (scenario) {
  void runChild(scenario).then(() => process.exit(0));
} else {
  void runParent();
}
