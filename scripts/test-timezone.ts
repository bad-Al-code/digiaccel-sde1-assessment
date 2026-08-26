import { loadTestEnv } from './lib/guard';
import { Reporter } from './lib/reporter';
import { startTestServer } from './lib/test-server';
import { createSession } from './lib/session';
import {
  cleanupFixtures,
  connectFixtures,
  disconnectFixtures,
  registerCleanupHooks,
} from './lib/fixtures';
import type { TestClient } from './lib/test-client';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  code?: string;
  errors?: { field: string; message: string }[];
  meta?: { total?: number };
}

interface TaskRow {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
}

const IST = 5.5 * 60;
const PST = -8 * 60;

function localDayRangeFor(dateKey: string, offsetMinutes: number): { from: string; to: string } {
  const midnightUtcMs = Date.parse(`${dateKey}T00:00:00.000Z`);
  const from = new Date(midnightUtcMs - offsetMinutes * 60_000);
  const to = new Date(from.getTime() + 86_400_000 - 1);

  return { from: from.toISOString(), to: to.toISOString() };
}

async function listRange(client: TestClient, range: { from: string; to: string }) {
  const query = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&limit=100`;
  const response = await client.get<Envelope<TaskRow[]>>(`/api/tasks?${query}`);

  return { status: response.status, titles: (response.body.data ?? []).map((t) => t.title) };
}

function create(client: TestClient, title: string, startAt: string, endAt?: string) {
  return client.post<Envelope<TaskRow>>('/api/tasks', {
    title,
    startAt,
    ...(endAt ? { endAt } : {}),
  });
}

async function main(): Promise<void> {
  const { uri, dbName } = loadTestEnv();
  registerCleanupHooks();

  const reporter = new Reporter();
  console.log('\nTimezone handling');
  console.log(`  database: ${dbName}`);

  await connectFixtures(uri, dbName);
  await cleanupFixtures();

  const server = await startTestServer(dbName, 3361);

  try {
    await runOffsetNormalisation(reporter, server.baseUrl);
    await runLocalDayFiltering(reporter, server.baseUrl);
    await runBoundaryInclusivity(reporter, server.baseUrl);
    await runDaylightSaving(reporter, server.baseUrl);
    await runRangeValidation(reporter, server.baseUrl);
  } finally {
    await server.stop();
    const removed = await cleanupFixtures();
    console.log(`\n  cleaned up ${removed} fixture user(s)`);
    await disconnectFixtures();
  }

  reporter.summary('Timezone');
}

async function runOffsetNormalisation(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Offsets normalise to the same UTC instant');
  const { client } = await createSession(baseUrl, 'tz-offset');

  const cases: [string, string, string][] = [
    ['IST +05:30', '2026-11-10T09:00:00+05:30', '2026-11-10T03:30:00.000Z'],
    ['PST -08:00', '2026-11-10T09:00:00-08:00', '2026-11-10T17:00:00.000Z'],
    ['NZDT +13:00', '2026-11-10T09:00:00+13:00', '2026-11-09T20:00:00.000Z'],
    ['Zulu', '2026-11-10T09:00:00.000Z', '2026-11-10T09:00:00.000Z'],
    ['half-hour -03:30', '2026-11-10T09:00:00-03:30', '2026-11-10T12:30:00.000Z'],
    ['45-minute +05:45', '2026-11-10T09:00:00+05:45', '2026-11-10T03:15:00.000Z'],
  ];

  for (const [label, input, expected] of cases) {
    const created = await create(client, `offset ${label}`, input);
    reporter.equal(`${label} stored as UTC`, created.body.data?.startAt, expected);
  }

  const withEnd = await create(
    client,
    'offset window',
    '2026-11-11T09:00:00+05:30',
    '2026-11-11T10:00:00+05:30',
  );
  reporter.equal('endAt normalises too', withEnd.body.data?.endAt, '2026-11-11T04:30:00.000Z');

  const crossMidnight = await create(
    client,
    'offset crossing midnight',
    '2026-11-12T23:30:00-08:00',
  );
  reporter.equal(
    'a late local evening rolls into the next UTC day',
    crossMidnight.body.data?.startAt,
    '2026-11-13T07:30:00.000Z',
  );
}

async function runLocalDayFiltering(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('A local day selects the right tasks');
  const { client } = await createSession(baseUrl, 'tz-day');

  await create(client, 'ist early morning', '2026-12-01T00:30:00+05:30');
  await create(client, 'ist late night', '2026-12-01T23:30:00+05:30');
  await create(client, 'previous ist day', '2026-11-30T23:30:00+05:30');
  await create(client, 'next ist day', '2026-12-02T00:30:00+05:30');

  const istDay = await listRange(client, localDayRangeFor('2026-12-01', IST));
  reporter.equal('IST day returns 200', istDay.status, 200);
  reporter.equal(
    'IST day contains exactly its own tasks',
    istDay.titles.sort().join('|'),
    'ist early morning|ist late night',
  );

  reporter.ok(
    'the 00:30 IST task is not lost to the previous UTC day',
    istDay.titles.includes('ist early morning'),
  );

  const utcDay = await listRange(client, {
    from: '2026-12-01T00:00:00.000Z',
    to: '2026-12-01T23:59:59.999Z',
  });
  reporter.ok(
    'the same UTC day would have given a different set',
    utcDay.titles.sort().join('|') !== istDay.titles.sort().join('|'),
  );

  const pstDay = await listRange(client, localDayRangeFor('2026-11-30', PST));
  reporter.ok(
    'a PST viewer sees the 00:30 IST task on their previous day',
    pstDay.titles.includes('ist early morning'),
  );
}

async function runBoundaryInclusivity(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Range boundaries are inclusive');
  const { client } = await createSession(baseUrl, 'tz-bounds');

  const range = localDayRangeFor('2027-01-15', IST);

  await create(client, 'exactly at from', range.from);
  await create(client, 'exactly at to', range.to);
  await create(client, 'one ms before from', new Date(Date.parse(range.from) - 1).toISOString());
  await create(client, 'one ms after to', new Date(Date.parse(range.to) + 1).toISOString());

  const found = await listRange(client, range);
  reporter.ok('the task exactly at from is included', found.titles.includes('exactly at from'));
  reporter.ok('the task exactly at to is included', found.titles.includes('exactly at to'));
  reporter.ok('one ms before from is excluded', !found.titles.includes('one ms before from'));
  reporter.ok('one ms after to is excluded', !found.titles.includes('one ms after to'));
  reporter.equal('exactly two tasks match the range', found.titles.length, 2);
}

async function runDaylightSaving(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Daylight saving transitions');
  const { client } = await createSession(baseUrl, 'tz-dst');

  await create(client, 'before spring forward', '2027-03-14T01:30:00-05:00');
  await create(client, 'after spring forward', '2027-03-14T03:30:00-04:00');

  const springDay = await listRange(client, {
    from: '2027-03-14T05:00:00.000Z',
    to: '2027-03-15T03:59:59.999Z',
  });
  reporter.equal(
    'a 23 hour local day still holds both tasks',
    springDay.titles.sort().join('|'),
    'after spring forward|before spring forward',
  );

  await create(client, 'first one am', '2027-11-07T01:30:00-04:00');
  await create(client, 'second one am', '2027-11-07T01:30:00-05:00');

  const fallDay = await listRange(client, {
    from: '2027-11-07T04:00:00.000Z',
    to: '2027-11-08T04:59:59.999Z',
  });
  reporter.equal(
    'a 25 hour local day holds a repeated local hour twice',
    fallDay.titles.filter((t) => t.includes('one am')).length,
    2,
  );
}

async function runRangeValidation(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Range validation');
  const { client } = await createSession(baseUrl, 'tz-valid');

  const cases: [string, string, number][] = [
    ['from without to', '/api/tasks?from=2026-12-01T00:00:00.000Z', 400],
    ['to without from', '/api/tasks?to=2026-12-01T00:00:00.000Z', 400],
    ['to before from', '/api/tasks?from=2026-12-02T00:00:00.000Z&to=2026-12-01T00:00:00.000Z', 400],
    [
      'to equal to from',
      '/api/tasks?from=2026-12-01T00:00:00.000Z&to=2026-12-01T00:00:00.000Z',
      400,
    ],
    [
      'range combined with weekStart',
      '/api/tasks?from=2026-12-01T00:00:00.000Z&to=2026-12-02T00:00:00.000Z&weekStart=2026-11-30',
      400,
    ],
    [
      'range combined with date',
      '/api/tasks?from=2026-12-01T00:00:00.000Z&to=2026-12-02T00:00:00.000Z&date=2026-12-01',
      400,
    ],
    ['from without an offset', '/api/tasks?from=2026-12-01T00:00:00&to=2026-12-02T00:00:00', 400],
    ['a valid range', '/api/tasks?from=2026-12-01T00:00:00.000Z&to=2026-12-02T00:00:00.000Z', 200],
  ];

  for (const [label, path, expected] of cases) {
    const response = await client.get<Envelope>(path);
    reporter.equal(label, response.status, expected);
  }

  const named = await client.get<Envelope>('/api/tasks?from=2026-12-01T00:00:00.000Z');
  reporter.ok(
    'the validation error names the to field',
    (named.body.errors ?? []).some((error) => error.field === 'to'),
  );
}

void main().catch(async (error: unknown) => {
  console.error('\nFatal:', error instanceof Error ? error.message : error);
  await cleanupFixtures().catch(() => undefined);
  await disconnectFixtures().catch(() => undefined);
  process.exit(1);
});
