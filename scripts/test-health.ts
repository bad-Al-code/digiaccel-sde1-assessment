import { loadTestEnv } from './lib/guard';
import { Reporter } from './lib/reporter';
import { TestClient } from './lib/test-client';
import { startTestServer } from './lib/test-server';
import { HealthRegistry } from '../src/server/modules/health/health-registry';
import {
  HealthStatus,
  type HealthCheckResult,
  type IHealthCheck,
} from '../src/server/modules/health/health.types';

const UNREACHABLE_URI = 'mongodb://10.255.255.1:27017/?connectTimeoutMS=1500';

interface CheckRow {
  name: string;
  status: string;
  latencyMs: number;
  detail?: Record<string, unknown>;
  error?: string;
}

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

interface Report {
  status: string;
  checks: CheckRow[];
  uptimeSeconds: number;
  environment: string;
  version: string;
  checkedAt: string;
}

class StubCheck implements IHealthCheck {
  constructor(
    public readonly name: string,
    public readonly timeoutMs: number,
    private readonly behaviour: 'healthy' | 'degraded' | 'throws' | 'hangs',
  ) {}

  public async check(): Promise<HealthCheckResult> {
    if (this.behaviour === 'throws') {
      throw new Error('stub exploded');
    }

    if (this.behaviour === 'hangs') {
      await new Promise(() => undefined);
    }

    return {
      name: this.name,
      status: this.behaviour === 'degraded' ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
      latencyMs: 1,
    };
  }
}

async function main(): Promise<void> {
  const { uri, dbName } = loadTestEnv();
  const reporter = new Reporter();

  console.log('\nHealth endpoints and registry');
  console.log(`  database: ${dbName}`);

  await runRegistryUnits(reporter);

  const healthy = await startTestServer(dbName, 3331);

  try {
    await runLiveness(reporter, healthy.baseUrl);
    await runReadinessHealthy(reporter, healthy.baseUrl, uri);
  } finally {
    await healthy.stop();
  }

  const broken = await startTestServer(dbName, 3332, { MONGODB_URI: UNREACHABLE_URI });

  try {
    await runReadinessUnhealthy(reporter, broken.baseUrl);
  } finally {
    await broken.stop();
  }

  reporter.summary('Health');
}

async function runRegistryUnits(reporter: Reporter): Promise<void> {
  reporter.group('Registry behaviour');

  const empty = await new HealthRegistry([], 'test', 'test').runAll();
  reporter.equal('an empty registry is healthy', empty.status, HealthStatus.HEALTHY);
  reporter.equal('and reports no checks', empty.checks.length, 0);

  const throwing = await new HealthRegistry(
    [new StubCheck('ok', 500, 'healthy'), new StubCheck('boom', 500, 'throws')],
    'test',
    'test',
  ).runAll();
  reporter.equal('a throwing check becomes UNHEALTHY', throwing.status, HealthStatus.UNHEALTHY);
  reporter.equal('and does not take down the report', throwing.checks.length, 2);
  reporter.ok(
    'the failing check is named',
    throwing.checks.some((c) => c.name === 'boom' && c.status === HealthStatus.UNHEALTHY),
  );
  reporter.ok(
    'the healthy check still reports',
    throwing.checks.some((c) => c.name === 'ok' && c.status === HealthStatus.HEALTHY),
  );

  const startedAt = Date.now();
  const hanging = await new HealthRegistry(
    [new StubCheck('stuck', 400, 'hangs')],
    'test',
    'test',
  ).runAll();
  const elapsed = Date.now() - startedAt;

  reporter.equal('a hanging check is timed out', hanging.status, HealthStatus.UNHEALTHY);
  reporter.ok(`and the report still returns quickly (${elapsed}ms)`, elapsed < 3_000);
  reporter.ok('the timeout is reported as an error', Boolean(hanging.checks[0]?.error));
  reporter.ok(
    'latency is recorded for the timed-out check',
    (hanging.checks[0]?.latencyMs ?? 0) > 0,
  );

  const degraded = await new HealthRegistry(
    [new StubCheck('a', 500, 'healthy'), new StubCheck('b', 500, 'degraded')],
    'test',
    'test',
  ).runAll();
  reporter.equal(
    'degraded with none unhealthy aggregates to DEGRADED',
    degraded.status,
    HealthStatus.DEGRADED,
  );

  const mixed = await new HealthRegistry(
    [new StubCheck('a', 500, 'degraded'), new StubCheck('b', 500, 'throws')],
    'test',
    'test',
  ).runAll();
  reporter.equal('the worst status wins', mixed.status, HealthStatus.UNHEALTHY);

  const concurrentStart = Date.now();
  await new HealthRegistry(
    [
      new StubCheck('one', 900, 'hangs'),
      new StubCheck('two', 900, 'hangs'),
      new StubCheck('three', 900, 'hangs'),
    ],
    'test',
    'test',
  ).runAll();
  const concurrentElapsed = Date.now() - concurrentStart;
  reporter.ok(
    `three 900ms timeouts run concurrently, not serially (${concurrentElapsed}ms)`,
    concurrentElapsed < 2_000,
  );
}

async function runLiveness(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Liveness');
  const client = new TestClient(baseUrl);

  const startedAt = Date.now();
  const response = await client.get<Envelope<Report>>('/api/health');
  const elapsed = Date.now() - startedAt;

  reporter.equal('returns 200', response.status, 200);
  reporter.ok('uses the standard envelope', response.body.success === true);
  reporter.ok('reports uptime', typeof response.body.data?.uptimeSeconds === 'number');
  reporter.ok('reports a version', typeof response.body.data?.version === 'string');
  reporter.equal('sets Cache-Control no-store', response.headers.get('cache-control'), 'no-store');
  reporter.ok(`responds quickly (${elapsed}ms)`, elapsed < 2_000);
  reporter.ok('carries no per-check detail', response.body.data?.checks === undefined);
  reporter.ok('leaks no connection string', !/mongodb\+srv|REDACTED/i.test(response.raw));
}

async function runReadinessHealthy(
  reporter: Reporter,
  baseUrl: string,
  uri: string,
): Promise<void> {
  reporter.group('Readiness when healthy');
  const client = new TestClient(baseUrl);

  const response = await client.get<Envelope<Report>>('/api/health/ready');
  const report = response.body.data as Report;

  reporter.equal('returns 200', response.status, 200);
  reporter.equal('overall status is HEALTHY', report.status, HealthStatus.HEALTHY);
  reporter.equal('sets Cache-Control no-store', response.headers.get('cache-control'), 'no-store');

  const names = report.checks.map((check) => check.name).sort();
  reporter.equal('all three checks report', names.join(','), 'configuration,mongodb,runtime');
  reporter.ok(
    'every check carries a status and latency',
    report.checks.every((c) => typeof c.status === 'string' && typeof c.latencyMs === 'number'),
  );

  const mongo = report.checks.find((check) => check.name === 'mongodb');
  reporter.equal('mongodb is healthy', mongo?.status, HealthStatus.HEALTHY);
  reporter.ok('mongodb reports a real ping latency', (mongo?.latencyMs ?? -1) >= 0);
  reporter.equal('mongodb reports readyState connected', mongo?.detail?.readyState, 'connected');

  const runtime = report.checks.find((check) => check.name === 'runtime');
  reporter.ok('runtime reports node version', typeof runtime?.detail?.nodeVersion === 'string');
  reporter.ok('runtime reports heap usage', typeof runtime?.detail?.heapUsedMb === 'number');

  const password = uri.split(':')[2]?.split('@')[0] ?? 'nothing';
  reporter.ok('no password anywhere in the payload', !response.raw.includes(password));
  reporter.ok('no connection string in the payload', !/mongodb\+srv/i.test(response.raw));
  reporter.ok('no JWT secret in the payload', !/JWT_|SECRET/i.test(response.raw));

  const anonymous = new TestClient(baseUrl);
  const withoutCookies = await anonymous.get<Envelope>('/api/health/ready');
  reporter.equal('readiness is public', withoutCookies.status, 200);

  const burst = await Promise.all(
    Array.from({ length: 15 }, () => client.get<Envelope>('/api/health/ready')),
  );
  reporter.ok(
    'health endpoints are not rate limited',
    burst.every((r) => r.status !== 429),
  );
}

async function runReadinessUnhealthy(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Readiness when the database is unreachable');
  const client = new TestClient(baseUrl);

  const liveness = await client.get<Envelope<Report>>('/api/health');
  reporter.equal('liveness still returns 200 with Mongo down', liveness.status, 200);

  const startedAt = Date.now();
  const readiness = await client.get<Envelope<Report>>('/api/health/ready');
  const elapsed = Date.now() - startedAt;

  reporter.equal('readiness returns 503', readiness.status, 503);
  reporter.equal('code is SERVICE_UNAVAILABLE', readiness.body.code, 'SERVICE_UNAVAILABLE');
  reporter.ok('the failing dependency is named', /mongodb/i.test(readiness.body.message ?? ''));
  reporter.ok(`bounded response time (${elapsed}ms)`, elapsed < 15_000);
  reporter.ok(
    'no credentials in the failure payload',
    !/REDACTED|mongodb\+srv/i.test(readiness.raw),
  );
  reporter.ok('no stack trace in the failure payload', !/\bat \w+ \(/.test(readiness.raw));

  const secondLiveness = await client.get<Envelope<Report>>('/api/health');
  reporter.equal('liveness remains 200 after a failed readiness', secondLiveness.status, 200);
}

void main().catch((error: unknown) => {
  console.error('\nFatal:', error instanceof Error ? error.message : error);
  process.exit(1);
});
