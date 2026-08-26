import { loadTestEnv } from './lib/guard';
import { Reporter } from './lib/reporter';
import { startTestServer } from './lib/test-server';
import { createSession, seedTask, type TaskRecord } from './lib/session';
import {
  cleanupFixtures,
  connectFixtures,
  disconnectFixtures,
  registerCleanupHooks,
} from './lib/fixtures';
import { getWeekEnd, getWeekStart, isSameWeek } from '../src/lib/week-range';
import type { TestClient } from './lib/test-client';

interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  openTaskCount: number;
  completedTaskCount: number;
  totalTaskCount: number;
  completionPercentage: number;
}

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  code?: string;
  meta?: { total?: number };
}

async function main(): Promise<void> {
  const { uri, dbName } = loadTestEnv();
  registerCleanupHooks();

  const reporter = new Reporter();
  console.log('\nWeek boundaries, timezones and aggregation');
  console.log(`  database: ${dbName}`);

  runPureWeekMath(reporter);

  await connectFixtures(uri, dbName);
  await cleanupFixtures();

  const server = await startTestServer(dbName, 3322);

  try {
    await runBoundaryTasks(reporter, server.baseUrl);
    await runTimezoneFiling(reporter, server.baseUrl);
    await runAggregation(reporter, server.baseUrl);
    await runCrossWeekMove(reporter, server.baseUrl);
  } finally {
    await server.stop();
    const removed = await cleanupFixtures();
    console.log(`\n  cleaned up ${removed} fixture user(s)`);
    await disconnectFixtures();
  }

  reporter.summary('Week math');
}

function runPureWeekMath(reporter: Reporter): void {
  reporter.group('Pure week arithmetic');

  const monday = getWeekStart(new Date('2026-01-14T10:30:00.000Z'));
  reporter.equal('Wednesday maps to Monday', monday.toISOString(), '2026-01-12T00:00:00.000Z');
  reporter.equal(
    'week end is Sunday 23:59:59.999',
    getWeekEnd(new Date('2026-01-14T10:30:00.000Z')).toISOString(),
    '2026-01-18T23:59:59.999Z',
  );

  const starts = new Set<string>();
  for (let day = 0; day < 7; day += 1) {
    starts.add(getWeekStart(new Date(monday.getTime() + day * 86_400_000)).toISOString());
  }
  reporter.equal('all seven days share one week start', starts.size, 1);

  reporter.equal(
    'Sunday maps back to the preceding Monday',
    getWeekStart(new Date('2026-01-18T23:59:59.999Z')).toISOString(),
    '2026-01-12T00:00:00.000Z',
  );
  reporter.ok(
    'Sunday 23:59 and Monday 00:01 are different weeks',
    !isSameWeek(new Date('2026-01-18T23:59:00.000Z'), new Date('2026-01-19T00:01:00.000Z')),
  );

  reporter.ok(
    'year boundary 31 Dec 2025 and 1 Jan 2026 share a week',
    isSameWeek(new Date('2025-12-31T12:00:00.000Z'), new Date('2026-01-01T12:00:00.000Z')),
  );

  reporter.equal(
    'leap day resolves correctly',
    getWeekStart(new Date('2028-02-29T12:00:00.000Z')).toISOString(),
    '2028-02-28T00:00:00.000Z',
  );

  reporter.equal(
    'US DST forward date unaffected',
    getWeekStart(new Date('2026-03-08T07:00:00.000Z')).toISOString(),
    '2026-03-02T00:00:00.000Z',
  );
  reporter.equal(
    'EU DST back date unaffected',
    getWeekStart(new Date('2026-10-25T01:00:00.000Z')).toISOString(),
    '2026-10-19T00:00:00.000Z',
  );

  reporter.ok(
    'milliseconds are zeroed',
    monday.getUTCMilliseconds() === 0 &&
      monday.getUTCSeconds() === 0 &&
      monday.getUTCMinutes() === 0,
  );

  const input = new Date('2026-01-14T10:30:00.000Z');
  const snapshot = input.getTime();
  getWeekStart(input);
  getWeekEnd(input);
  reporter.equal('inputs are never mutated', input.getTime(), snapshot);
}

async function runBoundaryTasks(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Tasks at week boundaries');
  const { client } = await createSession(baseUrl, 'boundary');

  await seedTask(client, { title: 'Sunday last minute', startAt: '2026-01-18T23:59:00.000Z' });
  await seedTask(client, { title: 'Monday first minute', startAt: '2026-01-19T00:01:00.000Z' });

  const weekOne = await listWeek(client, '2026-01-12');
  const weekTwo = await listWeek(client, '2026-01-19');

  reporter.equal('Sunday task falls in the earlier week', weekOne.length, 1);
  reporter.equal('Sunday task is the right one', weekOne[0]?.title, 'Sunday last minute');
  reporter.equal('Monday task falls in the later week', weekTwo.length, 1);
  reporter.equal('Monday task is the right one', weekTwo[0]?.title, 'Monday first minute');

  const midweek = await listWeek(client, '2026-01-15');
  reporter.equal('a midweek date resolves to the same week', midweek.length, 1);
}

async function runTimezoneFiling(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Timezone offsets file into the correct UTC week');
  const { client } = await createSession(baseUrl, 'timezone');

  const farEast = await seedTask(client, {
    title: 'Auckland Monday morning',
    startAt: '2026-01-19T00:30:00+13:00',
  });
  reporter.equal(
    'UTC+13 Monday normalises to Sunday UTC',
    farEast.startAt,
    '2026-01-18T11:30:00.000Z',
  );

  const earlierWeek = await listWeek(client, '2026-01-12');
  reporter.ok(
    'and is therefore filed in the earlier UTC week',
    earlierWeek.some((t) => t.id === farEast.id),
  );

  const farWest = await seedTask(client, {
    title: 'Los Angeles Sunday evening',
    startAt: '2026-01-18T20:00:00-08:00',
  });
  reporter.equal(
    'UTC-8 Sunday normalises to Monday UTC',
    farWest.startAt,
    '2026-01-19T04:00:00.000Z',
  );

  const laterWeek = await listWeek(client, '2026-01-19');
  reporter.ok(
    'and is therefore filed in the later UTC week',
    laterWeek.some((t) => t.id === farWest.id),
  );
}

async function runAggregation(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Week summaries');
  const { client } = await createSession(baseUrl, 'summary');

  const weekStart = '2026-03-02';
  const ids: string[] = [];

  for (let index = 0; index < 7; index += 1) {
    const task = await seedTask(client, {
      title: `Aggregate ${index}`,
      startAt: `2026-03-0${(index % 5) + 2}T09:00:00.000Z`,
    });
    ids.push(task.id);
  }

  for (const id of ids.slice(0, 3)) {
    await client.patch(`/api/tasks/${id}/status`, { status: 'COMPLETED' });
  }

  const weeks = await client.get<Envelope<WeekSummary[]>>(
    '/api/weeks?from=2026-03-02&to=2026-03-08&limit=12',
  );
  reporter.equal('weeks endpoint returns 200', weeks.status, 200);

  const summaries = weeks.body.data ?? [];
  const target = summaries.find((s) => s.weekStart.startsWith(weekStart));

  reporter.ok('the seeded week appears in the summaries', target !== undefined);
  reporter.equal('total counts every task in the week', target?.totalTaskCount, 7);
  reporter.equal('completed count is correct', target?.completedTaskCount, 3);
  reporter.equal('open count is correct', target?.openTaskCount, 4);
  reporter.equal('completion percentage is rounded', target?.completionPercentage, 43);
  reporter.equal('week end is Sunday 23:59:59.999', target?.weekEnd, '2026-03-08T23:59:59.999Z');

  const paged = await client.get<Envelope<TaskRecord[]>>(
    `/api/tasks?weekStart=${weekStart}&limit=2`,
  );
  reporter.equal('a page returns only its own rows', (paged.body.data ?? []).length, 2);
  reporter.equal('but total still counts the whole week', paged.body.meta?.total, 7);

  const ordered = summaries.map((s) => s.weekStart);
  const sortedDesc = [...ordered].sort().reverse();
  reporter.equal('summaries are newest week first', ordered.join(','), sortedDesc.join(','));

  const defaultWindow = await client.get<Envelope<WeekSummary[]>>('/api/weeks?limit=4');
  reporter.ok('default window is bounded by limit', (defaultWindow.body.data ?? []).length <= 4);
  reporter.ok(
    'default window does not reach a distant past week',
    !(defaultWindow.body.data ?? []).some((s) => s.weekStart.startsWith('2026-03-02')),
  );

  const reversedRange = await client.get<Envelope>('/api/weeks?from=2026-03-08&to=2026-03-02');
  reporter.equal('to before from returns 400', reversedRange.status, 400);

  const badLimit = await client.get<Envelope>('/api/weeks?limit=53');
  reporter.equal('weeks limit above 52 returns 400', badLimit.status, 400);

  const fresh = await createSession(baseUrl, 'freshweek');
  const emptyWeeks = await fresh.client.get<Envelope<WeekSummary[]>>('/api/weeks');
  const emptySummaries = emptyWeeks.body.data ?? [];

  reporter.ok('a user with no tasks still gets the current week', emptySummaries.length >= 1);
  reporter.equal('empty week reports zero total', emptySummaries[0]?.totalTaskCount, 0);
  reporter.equal(
    'empty week reports 0 percent, not NaN',
    emptySummaries[0]?.completionPercentage,
    0,
  );
  reporter.ok(
    'percentage is a finite number',
    Number.isFinite(emptySummaries[0]?.completionPercentage),
  );
  reporter.ok('no NaN appears in the raw payload', !/NaN/.test(emptyWeeks.raw));

  const currentWeekStart = getWeekStart(new Date()).toISOString();
  reporter.equal(
    'the current week is the one returned',
    emptySummaries[0]?.weekStart,
    currentWeekStart,
  );
}

async function runCrossWeekMove(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Moving a task between weeks');
  const { client } = await createSession(baseUrl, 'move');

  const task = await seedTask(client, { title: 'Movable', startAt: '2026-04-08T09:00:00.000Z' });

  const before = await listWeek(client, '2026-04-06');
  reporter.equal('task starts in its original week', before.length, 1);

  const moved = await client.patch<Envelope<TaskRecord>>(`/api/tasks/${task.id}`, {
    startAt: '2026-04-15T09:00:00.000Z',
  });
  reporter.equal('moving startAt returns 200', moved.status, 200);

  const original = await listWeek(client, '2026-04-06');
  const destination = await listWeek(client, '2026-04-13');

  reporter.equal('task leaves the original week', original.length, 0);
  reporter.equal('task appears in the destination week', destination.length, 1);
  reporter.equal('and it is the same task', destination[0]?.id, task.id);

  const weeks = await client.get<Envelope<WeekSummary[]>>('/api/weeks?limit=52');
  const summaries = weeks.body.data ?? [];
  const originalWeek = summaries.find((s) => s.weekStart.startsWith('2026-04-06'));
  const destinationWeek = summaries.find((s) => s.weekStart.startsWith('2026-04-13'));

  reporter.ok('original week no longer counts it', originalWeek === undefined);
  reporter.equal('destination week counts it', destinationWeek?.totalTaskCount, 1);
}

async function listWeek(client: TestClient, weekStart: string): Promise<TaskRecord[]> {
  const response = await client.get<Envelope<TaskRecord[]>>(
    `/api/tasks?weekStart=${weekStart}&limit=100`,
  );

  return response.body.data ?? [];
}

void main().catch(async (error: unknown) => {
  console.error('\nFatal:', error instanceof Error ? error.message : error);
  await cleanupFixtures().catch(() => undefined);
  await disconnectFixtures().catch(() => undefined);
  process.exit(1);
});
