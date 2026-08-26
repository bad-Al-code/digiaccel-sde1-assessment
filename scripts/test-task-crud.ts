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
import type { TestClient } from './lib/test-client';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  errors?: { field: string; message: string }[];
  meta?: { total?: number; hasMore?: boolean; nextCursor?: string | null };
}

const BASE_START = '2026-01-14T10:00:00.000Z';

async function main(): Promise<void> {
  const { uri, dbName } = loadTestEnv();
  registerCleanupHooks();

  const reporter = new Reporter();
  console.log('\nTask CRUD, ownership and data integrity');
  console.log(`  database: ${dbName}`);

  await connectFixtures(uri, dbName);
  await cleanupFixtures();

  const server = await startTestServer(dbName, 3321);

  try {
    await runCreate(reporter, server.baseUrl);
    await runOwnership(reporter, server.baseUrl);
    await runUpdateSemantics(reporter, server.baseUrl);
    await runStatus(reporter, server.baseUrl);
    await runDelete(reporter, server.baseUrl);
    await runTextData(reporter, server.baseUrl);
    await runPagination(reporter, server.baseUrl);
    await runQueryValidation(reporter, server.baseUrl);
    await runConcurrency(reporter, server.baseUrl);
  } finally {
    await server.stop();
    const removed = await cleanupFixtures();
    console.log(`\n  cleaned up ${removed} fixture user(s)`);
    await disconnectFixtures();
  }

  reporter.summary('Task CRUD');
}

async function runCreate(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Create');
  const { client } = await createSession(baseUrl, 'create');

  const minimal = await client.post<Envelope<TaskRecord>>('/api/tasks', {
    title: 'Finishing Wireframe',
    startAt: BASE_START,
  });
  reporter.equal('minimal task returns 201', minimal.status, 201);

  const task = minimal.body.data as TaskRecord;
  reporter.ok('response carries an id', typeof task.id === 'string' && task.id.length === 24);
  reporter.ok('no _id in the payload', !/"_id"/.test(minimal.raw));
  reporter.ok('no ownerId in the payload', !/ownerId/.test(minimal.raw));
  reporter.ok('no __v in the payload', !/__v/.test(minimal.raw));
  reporter.equal('defaults to IN_PROGRESS', task.status, 'IN_PROGRESS');
  reporter.equal('completedAt starts null', task.completedAt, null);
  reporter.equal('endAt defaults to null', task.endAt, null);
  reporter.equal('priority defaults to null', task.priority, null);

  const full = await client.post<Envelope<TaskRecord>>('/api/tasks', {
    title: 'Full task',
    description: 'Everything set',
    startAt: BASE_START,
    endAt: '2026-01-14T11:00:00.000Z',
    priority: 'HIGH',
  });
  reporter.equal('all optional fields accepted', full.status, 201);
  reporter.equal('priority persisted', (full.body.data as TaskRecord).priority, 'HIGH');

  const reversed = await client.post<Envelope>('/api/tasks', {
    title: 'Reversed window',
    startAt: '2026-01-14T11:00:00.000Z',
    endAt: BASE_START,
  });
  reporter.equal('endAt before startAt returns 400', reversed.status, 400);

  const equal = await client.post<Envelope>('/api/tasks', {
    title: 'Zero length window',
    startAt: BASE_START,
    endAt: BASE_START,
  });
  reporter.equal('endAt equal to startAt returns 400', equal.status, 400);

  const withStatus = await client.post<Envelope>('/api/tasks', {
    title: 'Sneaky',
    startAt: BASE_START,
    status: 'COMPLETED',
  });
  reporter.equal('status rejected on create', withStatus.status, 400);

  const noOffset = await client.post<Envelope>('/api/tasks', {
    title: 'Ambiguous',
    startAt: '2026-01-14T10:00:00',
  });
  reporter.equal('datetime without offset returns 400', noOffset.status, 400);

  const dateOnly = await client.post<Envelope>('/api/tasks', {
    title: 'Date only',
    startAt: '2026-01-14',
  });
  reporter.equal('date without time returns 400', dateOnly.status, 400);

  const absurd = await client.post<Envelope>('/api/tasks', {
    title: 'Year 9999',
    startAt: '9999-01-14T10:00:00.000Z',
  });
  reporter.equal('year 9999 rejected as out of range', absurd.status, 400);

  const preEpoch = await client.post<Envelope>('/api/tasks', {
    title: 'Year 1900',
    startAt: '1900-01-14T10:00:00.000Z',
  });
  reporter.equal('pre-1970 rejected as out of range', preEpoch.status, 400);

  const offsetStart = await client.post<Envelope<TaskRecord>>('/api/tasks', {
    title: 'IST offset',
    startAt: '2026-01-14T15:30:00+05:30',
  });
  reporter.equal('non-UTC offset accepted', offsetStart.status, 201);
  reporter.equal(
    'offset normalised to UTC on the way out',
    (offsetStart.body.data as TaskRecord).startAt,
    '2026-01-14T10:00:00.000Z',
  );
}

async function runOwnership(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Ownership isolation');

  const alice = await createSession(baseUrl, 'alice');
  const bob = await createSession(baseUrl, 'bob');

  const aliceTask = await seedTask(alice.client, {
    title: 'Alice private planning',
    startAt: BASE_START,
  });

  const read = await bob.client.get<Envelope>(`/api/tasks/${aliceTask.id}`);
  reporter.equal("reading another owner's task returns 404", read.status, 404);
  reporter.equal('code is TASK_NOT_FOUND, not FORBIDDEN', read.body.code, 'TASK_NOT_FOUND');

  const patch = await bob.client.patch<Envelope>(`/api/tasks/${aliceTask.id}`, {
    title: 'Hijacked',
  });
  reporter.ok('cross-owner PATCH does not succeed', patch.status !== 200);

  const del = await bob.client.get<Envelope>(`/api/tasks/${aliceTask.id}`);
  reporter.equal('cross-owner read stays 404', del.status, 404);

  const list = await bob.client.get<Envelope<TaskRecord[]>>('/api/tasks?weekStart=2026-01-12');
  const bobSees = (list.body.data ?? []).some((t) => t.id === aliceTask.id);
  reporter.ok("another owner's task never appears in a list", !bobSees);

  const search = await bob.client.get<Envelope<TaskRecord[]>>('/api/tasks/search?q=private');
  reporter.equal('cross-owner search returns 200', search.status, 200);
  reporter.equal('cross-owner search returns nothing', (search.body.data ?? []).length, 0);

  const injected = await bob.client.get<Envelope<TaskRecord[]>>(
    `/api/tasks?weekStart=2026-01-12&ownerId=${aliceTask.id}`,
  );
  reporter.equal('ownerId in the query is rejected by .strict()', injected.status, 400);

  const stillThere = await alice.client.get<Envelope>(`/api/tasks/${aliceTask.id}`);
  reporter.equal('owner can still read their own task', stillThere.status, 200);
}

async function runUpdateSemantics(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Update semantics');
  const { client } = await createSession(baseUrl, 'update');

  const task = await seedTask(client, {
    title: 'Original title',
    description: 'Original description',
    startAt: BASE_START,
    endAt: '2026-01-14T12:00:00.000Z',
  });

  const partial = await patchTask(client, task.id, { title: 'Renamed' });
  reporter.equal('partial update returns 200', partial.status, 200);
  reporter.equal('changed field updated', (partial.body.data as TaskRecord).title, 'Renamed');
  reporter.equal(
    'untouched field preserved',
    (partial.body.data as TaskRecord).description,
    'Original description',
  );

  const empty = await patchTask(client, task.id, {});
  reporter.equal('empty patch body returns 400', empty.status, 400);

  const badWindow = await patchTask(client, task.id, { endAt: '2026-01-14T09:00:00.000Z' });
  reporter.equal('endAt-only patch before stored startAt returns 400', badWindow.status, 400);
  reporter.equal('code is INVALID_TASK_WINDOW', badWindow.body.code, 'INVALID_TASK_WINDOW');

  const clearEnd = await patchTask(client, task.id, { endAt: null });
  reporter.equal('endAt null clears the value', (clearEnd.body.data as TaskRecord).endAt, null);

  const leaveEnd = await patchTask(client, task.id, { title: 'Renamed again' });
  reporter.equal(
    'endAt absent leaves it unchanged',
    (leaveEnd.body.data as TaskRecord).endAt,
    null,
  );

  const clearDescription = await patchTask(client, task.id, { description: null });
  reporter.equal(
    'description null clears the value',
    (clearDescription.body.data as TaskRecord).description,
    null,
  );

  const unknown = await patchTask(client, task.id, { evil: true });
  reporter.equal('unknown key rejected by .strict()', unknown.status, 400);

  const missing = await patchTask(client, '507f1f77bcf86cd799439011', { title: 'Ghost' });
  reporter.equal('patching a nonexistent id returns 404', missing.status, 404);

  const malformed = await patchTask(client, 'not-an-object-id', { title: 'Ghost' });
  reporter.ok('malformed id returns 400 or 404, never 500', [400, 404].includes(malformed.status));
}

async function runStatus(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Status transitions');
  const { client } = await createSession(baseUrl, 'status');

  const task = await seedTask(client, { title: 'Toggle me', startAt: BASE_START });

  const done = await setStatus(client, task.id, 'COMPLETED');
  reporter.equal('marking completed returns 200', done.status, 200);
  reporter.equal('status is COMPLETED', (done.body.data as TaskRecord).status, 'COMPLETED');
  reporter.ok('completedAt is set', (done.body.data as TaskRecord).completedAt !== null);

  const noop = await setStatus(client, task.id, 'COMPLETED');
  reporter.equal('setting the same status returns 200', noop.status, 200);
  reporter.equal(
    'no-op leaves status unchanged',
    (noop.body.data as TaskRecord).status,
    'COMPLETED',
  );

  const reverted = await setStatus(client, task.id, 'IN_PROGRESS');
  reporter.equal('reverting returns 200', reverted.status, 200);
  reporter.equal(
    'completedAt cleared on revert',
    (reverted.body.data as TaskRecord).completedAt,
    null,
  );

  const invalid = await setStatus(client, task.id, 'DONE');
  reporter.equal('invalid status value returns 400', invalid.status, 400);

  const otherField = await client.patch<Envelope>(`/api/tasks/${task.id}/status`, {
    status: 'COMPLETED',
    title: 'Should not be allowed',
  });
  reporter.ok('status endpoint cannot alter other fields', otherField.status !== 200);
}

async function runDelete(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Delete');
  const { client } = await createSession(baseUrl, 'delete');

  const task = await seedTask(client, { title: 'Temporary', startAt: BASE_START });

  const first = await deleteTask(client, task.id);
  reporter.equal('delete returns 200', first.status, 200);

  const second = await deleteTask(client, task.id);
  reporter.equal('second delete returns 404', second.status, 404);

  const read = await client.get<Envelope>(`/api/tasks/${task.id}`);
  reporter.equal('deleted task is gone', read.status, 404);

  const bogus = await deleteTask(client, 'zzzzzzzzzzzzzzzzzzzzzzzz');
  reporter.ok('malformed id never returns 500', bogus.status < 500);
}

async function runTextData(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Real-world text data');
  const { client } = await createSession(baseUrl, 'text');

  const emoji = await client.post<Envelope<TaskRecord>>('/api/tasks', {
    title: 'Buy a cat food \u{1F431}‍\u{1F453}',
    startAt: BASE_START,
  });
  reporter.equal('emoji with ZWJ sequence accepted', emoji.status, 201);
  reporter.equal(
    'emoji round-trips unchanged',
    (emoji.body.data as TaskRecord).title,
    'Buy a cat food \u{1F431}‍\u{1F453}',
  );

  const rtl = await client.post<Envelope<TaskRecord>>('/api/tasks', {
    title: 'مراجعة التصميم',
    startAt: BASE_START,
  });
  reporter.equal('right-to-left text accepted', rtl.status, 201);

  const combining = await client.post<Envelope<TaskRecord>>('/api/tasks', {
    title: 'Café meeting',
    startAt: BASE_START,
  });
  reporter.equal('combining diacritics accepted', combining.status, 201);

  const exact = await client.post<Envelope>('/api/tasks', {
    title: 'a'.repeat(120),
    startAt: BASE_START,
  });
  reporter.equal('title of exactly 120 characters accepted', exact.status, 201);

  const over = await client.post<Envelope>('/api/tasks', {
    title: 'a'.repeat(121),
    startAt: BASE_START,
  });
  reporter.equal('title of 121 characters rejected', over.status, 400);

  const whitespace = await client.post<Envelope>('/api/tasks', {
    title: '   \t  ',
    startAt: BASE_START,
  });
  reporter.equal('whitespace-only title rejected after trim', whitespace.status, 400);

  const padded = await client.post<Envelope<TaskRecord>>('/api/tasks', {
    title: '   Padded title   ',
    startAt: BASE_START,
  });
  reporter.equal(
    'title is trimmed on the way in',
    (padded.body.data as TaskRecord).title,
    'Padded title',
  );

  const newlines = await client.post<Envelope<TaskRecord>>('/api/tasks', {
    title: 'Multiline description',
    description: 'line one\nline two\r\nline three',
    startAt: BASE_START,
  });
  reporter.equal('newlines in description preserved', newlines.status, 201);

  const longDescription = await client.post<Envelope>('/api/tasks', {
    title: 'Too much detail',
    description: 'd'.repeat(2001),
    startAt: BASE_START,
  });
  reporter.equal('description over 2000 characters rejected', longDescription.status, 400);

  const htmlish = await client.post<Envelope<TaskRecord>>('/api/tasks', {
    title: '<script>alert(1)</script>',
    startAt: BASE_START,
  });
  reporter.equal('markup is stored literally, not executed or stripped', htmlish.status, 201);
  reporter.equal(
    'markup round-trips verbatim',
    (htmlish.body.data as TaskRecord).title,
    '<script>alert(1)</script>',
  );

  const mongoOperator = await client.post<Envelope>('/api/tasks', {
    title: { $ne: null },
    startAt: BASE_START,
  });
  reporter.equal('operator-shaped object as title rejected', mongoOperator.status, 400);
}

async function runPagination(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Pagination integrity');
  const { client } = await createSession(baseUrl, 'paging');

  const identical = '2026-02-04T09:00:00.000Z';
  const created: string[] = [];

  for (let index = 0; index < 10; index += 1) {
    const task = await seedTask(client, { title: `Same instant ${index}`, startAt: identical });
    created.push(task.id);
  }

  const seen: string[] = [];
  let cursor: string | null | undefined = null;
  let pages = 0;

  do {
    const query: string = cursor
      ? `/api/tasks?weekStart=2026-02-02&limit=3&cursor=${encodeURIComponent(cursor)}`
      : '/api/tasks?weekStart=2026-02-02&limit=3';
    const page = await client.get<Envelope<TaskRecord[]>>(query);

    if (page.status !== 200) {
      reporter.ok(`page ${pages} returned 200`, false, page.raw.slice(0, 200));
      break;
    }

    (page.body.data ?? []).forEach((task) => seen.push(task.id));
    cursor = page.body.meta?.nextCursor;
    pages += 1;
  } while (cursor && pages < 20);

  reporter.equal('every task with an identical timestamp is returned', seen.length, 10);
  reporter.equal('no task is returned twice', new Set(seen).size, 10);
  reporter.ok(
    'all seeded ids accounted for',
    created.every((id) => seen.includes(id)),
  );

  const firstPage = await client.get<Envelope<TaskRecord[]>>(
    '/api/tasks?weekStart=2026-02-02&limit=3',
  );
  reporter.equal('page size honoured', (firstPage.body.data ?? []).length, 3);
  reporter.equal('total counts the whole set, not the page', firstPage.body.meta?.total, 10);
  reporter.equal('hasMore is true on a partial page', firstPage.body.meta?.hasMore, true);

  const bigPage = await client.get<Envelope<TaskRecord[]>>(
    '/api/tasks?weekStart=2026-02-02&limit=100',
  );
  reporter.equal('a full page reports hasMore false', bigPage.body.meta?.hasMore, false);
  reporter.equal('nextCursor is null on the last page', bigPage.body.meta?.nextCursor, null);

  const garbageCursor = await client.get<Envelope>(
    '/api/tasks?weekStart=2026-02-02&cursor=not-a-real-cursor',
  );
  reporter.ok('malformed cursor never returns 500', garbageCursor.status < 500);

  const runA = await client.get<Envelope<TaskRecord[]>>('/api/tasks?weekStart=2026-02-02&limit=10');
  const runB = await client.get<Envelope<TaskRecord[]>>('/api/tasks?weekStart=2026-02-02&limit=10');
  reporter.equal(
    'identical requests return an identical order',
    (runA.body.data ?? []).map((t) => t.id).join(','),
    (runB.body.data ?? []).map((t) => t.id).join(','),
  );
}

async function runQueryValidation(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Query validation');
  const { client } = await createSession(baseUrl, 'query');

  const cases: [string, string, number][] = [
    ['limit=0', '/api/tasks?limit=0', 400],
    ['limit=-1', '/api/tasks?limit=-1', 400],
    ['limit=101', '/api/tasks?limit=101', 400],
    ['limit=abc', '/api/tasks?limit=abc', 400],
    ['limit=1.5', '/api/tasks?limit=1.5', 400],
    ['limit=100', '/api/tasks?limit=100', 200],
    ['weekStart and date together', '/api/tasks?weekStart=2026-01-12&date=2026-01-14', 400],
    ['malformed weekStart', '/api/tasks?weekStart=notadate', 400],
    ['invalid status filter', '/api/tasks?status=NOPE', 400],
    ['invalid priority filter', '/api/tasks?priority=URGENT', 400],
    ['unknown query key', '/api/tasks?bogus=1', 400],
  ];

  for (const [label, path, expected] of cases) {
    const response = await client.get<Envelope>(path);
    reporter.equal(label, response.status, expected);
  }

  const bad = await client.get<Envelope>('/api/tasks?limit=0');
  reporter.ok(
    'validation error names the limit field',
    (bad.body.errors ?? []).some((e) => e.field === 'limit'),
  );

  const idCases: [string, number][] = [
    ['short', 400],
    ['zzzzzzzzzzzzzzzzzzzzzzzz', 400],
    ['507f1f77bcf86cd799439011', 404],
  ];

  for (const [id, expected] of idCases) {
    const response = await client.get<Envelope>(`/api/tasks/${id}`);
    reporter.equal(`task id "${id.slice(0, 12)}" returns ${expected}`, response.status, expected);
  }
}

async function runConcurrency(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Concurrent writes');
  const { client } = await createSession(baseUrl, 'concurrent');

  const task = await seedTask(client, { title: 'Contended', startAt: BASE_START });

  const toggles = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      setStatus(client, task.id, index % 2 === 0 ? 'COMPLETED' : 'IN_PROGRESS'),
    ),
  );

  reporter.ok(
    'no concurrent toggle returns 500',
    toggles.every((r) => r.status < 500),
  );

  const final = await client.get<Envelope<TaskRecord>>(`/api/tasks/${task.id}`);
  const record = final.body.data as TaskRecord;
  reporter.ok(
    'final status is one of the two valid values',
    ['COMPLETED', 'IN_PROGRESS'].includes(record.status),
  );
  reporter.ok(
    'completedAt is consistent with the final status',
    record.status === 'COMPLETED' ? record.completedAt !== null : record.completedAt === null,
  );

  const writes = await Promise.all([
    patchTask(client, task.id, { title: 'Writer A' }),
    patchTask(client, task.id, { title: 'Writer B' }),
    patchTask(client, task.id, { title: 'Writer C' }),
  ]);
  reporter.ok(
    'concurrent patches all succeed',
    writes.every((r) => r.status === 200),
  );

  const after = await client.get<Envelope<TaskRecord>>(`/api/tasks/${task.id}`);
  reporter.ok(
    'one writer wins cleanly, no merged value',
    ['Writer A', 'Writer B', 'Writer C'].includes((after.body.data as TaskRecord).title),
  );
}

function patchTask(client: TestClient, taskId: string, body: unknown) {
  return client.patch<Envelope>(`/api/tasks/${taskId}`, body);
}

function setStatus(client: TestClient, taskId: string, status: string) {
  return client.patch<Envelope>(`/api/tasks/${taskId}/status`, { status });
}

function deleteTask(client: TestClient, taskId: string) {
  return client.delete<Envelope>(`/api/tasks/${taskId}`);
}

void main().catch(async (error: unknown) => {
  console.error('\nFatal:', error instanceof Error ? error.message : error);
  await cleanupFixtures().catch(() => undefined);
  await disconnectFixtures().catch(() => undefined);
  process.exit(1);
});
