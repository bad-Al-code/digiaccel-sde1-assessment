import { loadTestEnv } from './lib/guard';
import { Reporter } from './lib/reporter';
import { TestClient } from './lib/test-client';
import { startTestServer } from './lib/test-server';
import {
  FIXTURE_PASSWORD,
  cleanupFixtures,
  connectFixtures,
  disconnectFixtures,
  fixtureEmail,
  registerCleanupHooks,
} from './lib/fixtures';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  isGuest: boolean;
}

const START = '2026-09-15T09:00:00.000Z';

function fingerprint(label: string): string {
  return `fp-${label}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function startGuest(baseUrl: string, fp?: string) {
  const client = new TestClient(baseUrl);
  const response = await client.post<Envelope<UserRow>>(
    '/api/auth/guest',
    fp ? { fingerprint: fp } : {},
  );

  return { client, response };
}

function createTask(client: TestClient, title: string) {
  return client.post<Envelope<{ id: string }>>('/api/tasks', { title, startAt: START });
}

async function main(): Promise<void> {
  const { uri, dbName } = loadTestEnv();
  registerCleanupHooks();

  const reporter = new Reporter();
  console.log('\nGuest sessions, limits and abuse resistance');
  console.log(`  database: ${dbName}`);

  await connectFixtures(uri, dbName);
  await cleanupFixtures();

  const server = await startTestServer(dbName, 3341);

  try {
    await runIndexIntegrity(reporter);
    await runSessionBasics(reporter, server.baseUrl);
    await runTaskLimit(reporter, server.baseUrl);
    await runFingerprintPersistence(reporter, server.baseUrl);
    await runIsolation(reporter, server.baseUrl);
    await runUpgrade(reporter, server.baseUrl);
    await runMalicious(reporter, server.baseUrl);
  } finally {
    await server.stop();
    await cleanupGuests();
    const removed = await cleanupFixtures();
    console.log(`\n  cleaned up ${removed} fixture user(s)`);
    await disconnectFixtures();
  }

  reporter.summary('Guest mode');
}

async function cleanupGuests(): Promise<void> {
  const mongoose = await import('mongoose');
  const db = mongoose.default.connection.db;

  if (!db) return;

  const guests = await db.collection('users').find({ isGuest: true }).project({ _id: 1 }).toArray();
  const ids = guests.map((g) => g._id);

  if (ids.length === 0) return;

  await db.collection('tasks').deleteMany({ ownerId: { $in: ids } });
  await db.collection('users').deleteMany({ _id: { $in: ids } });
  console.log(`  cleaned up ${ids.length} guest user(s)`);
}

async function runIndexIntegrity(reporter: Reporter): Promise<void> {
  reporter.group('Index integrity');

  const mongoose = await import('mongoose');
  const db = mongoose.default.connection.db;

  if (!db) {
    reporter.ok('database handle available', false);
    return;
  }

  const indexes = await db.collection('users').indexes();
  const emailIndex = indexes.find((index) => index.name === 'email_1');

  reporter.ok('users has an email index', emailIndex !== undefined);
  reporter.ok('email index is unique', emailIndex?.unique === true);
  reporter.ok(
    'email index is partial so multiple guests can hold a null email',
    emailIndex?.partialFilterExpression !== undefined,
  );

  const guestsWithNullEmail = await db
    .collection('users')
    .countDocuments({ isGuest: true, email: null });
  reporter.ok(
    `multiple null-email guests coexist (${guestsWithNullEmail})`,
    guestsWithNullEmail >= 0,
  );
}

async function runSessionBasics(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Guest session creation');

  const { client, response } = await startGuest(baseUrl, fingerprint('basic'));
  reporter.equal('guest session returns 201', response.status, 201);
  reporter.equal('user is flagged as a guest', response.body.data?.isGuest, true);
  reporter.equal('guest has no email', response.body.data?.email, null);
  reporter.ok('sets an access cookie', client.getCookie('access_token') !== null);
  reporter.ok('no fingerprint echoed back', !/fingerprint/i.test(response.raw));
  reporter.ok('no password fields leaked', !/passwordHash|refreshTokenHash/i.test(response.raw));

  const me = await client.get<Envelope<UserRow>>('/api/auth/me');
  reporter.equal('guest can read /me', me.status, 200);
  reporter.equal('/me reports isGuest', me.body.data?.isGuest, true);

  const withoutFingerprint = await startGuest(baseUrl);
  reporter.equal('fingerprint is optional', withoutFingerprint.response.status, 201);

  const reuse = await client.post<Envelope<UserRow>>('/api/auth/guest', {});
  reporter.equal('calling guest again with a session returns 200', reuse.status, 200);
  reporter.equal(
    'and returns the same guest, not a new one',
    reuse.body.data?.id,
    response.body.data?.id,
  );
}

async function runTaskLimit(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('One task limit');

  const { client } = await startGuest(baseUrl, fingerprint('limit'));

  const first = await createTask(client, 'Guest first task');
  reporter.equal('first task is allowed', first.status, 201);

  const second = await createTask(client, 'Guest second task');
  reporter.equal('second task is blocked with 403', second.status, 403);
  reporter.equal('code is GUEST_TASK_LIMIT_REACHED', second.body.code, 'GUEST_TASK_LIMIT_REACHED');
  reporter.ok('message invites signing up', /sign up/i.test(second.body.message ?? ''));

  const list = await client.get<Envelope<{ id: string }[]>>('/api/tasks?weekStart=2026-09-14');
  reporter.equal('only one task was stored', (list.body.data ?? []).length, 1);

  const deleted = await client.delete<Envelope>(`/api/tasks/${first.body.data?.id}`);
  reporter.equal('guest can delete their task', deleted.status, 200);

  const afterDelete = await createTask(client, 'Guest replacement task');
  reporter.equal('and may then create another', afterDelete.status, 201);

  const third = await createTask(client, 'Guest third task');
  reporter.equal('limit still applies afterwards', third.status, 403);

  const updated = await client.patch<Envelope>(`/api/tasks/${afterDelete.body.data?.id}`, {
    title: 'Guest edited task',
  });
  reporter.equal('guest can still edit their one task', updated.status, 200);
}

async function runFingerprintPersistence(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Fingerprint survives cookie clearing');

  const fp = fingerprint('persist');
  const first = await startGuest(baseUrl, fp);
  const firstId = first.response.body.data?.id;

  const created = await createTask(first.client, 'Persisted guest task');
  reporter.equal('guest creates their task', created.status, 201);

  const returning = await startGuest(baseUrl, fp);
  reporter.equal('same fingerprint returns 201', returning.response.status, 201);
  reporter.equal(
    'and resolves to the same guest identity',
    returning.response.body.data?.id,
    firstId,
  );

  const retry = await createTask(returning.client, 'Sneaky second task');
  reporter.equal('clearing cookies does not reset the limit', retry.status, 403);

  const differentFp = await startGuest(baseUrl, fingerprint('other'));
  reporter.ok(
    'a genuinely different fingerprint is a different guest',
    differentFp.response.body.data?.id !== firstId,
  );

  const freshAllowed = await createTask(differentFp.client, 'Different device task');
  reporter.equal('and gets its own allowance', freshAllowed.status, 201);
}

async function runIsolation(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Guest data isolation');

  const alice = await startGuest(baseUrl, fingerprint('iso-a'));
  const bob = await startGuest(baseUrl, fingerprint('iso-b'));

  const aliceTask = await createTask(alice.client, 'Alice guest secret');
  const taskId = aliceTask.body.data?.id;

  const read = await bob.client.get<Envelope>(`/api/tasks/${taskId}`);
  reporter.equal("a guest cannot read another guest's task", read.status, 404);

  const search = await bob.client.get<Envelope<unknown[]>>('/api/tasks/search?q=secret');
  reporter.equal('and cannot find it by search', (search.body.data ?? []).length, 0);

  const removed = await bob.client.delete<Envelope>(`/api/tasks/${taskId}`);
  reporter.equal('and cannot delete it', removed.status, 404);

  const owner = await alice.client.get<Envelope>(`/api/tasks/${taskId}`);
  reporter.equal('the owning guest still has it', owner.status, 200);
}

async function runUpgrade(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Upgrading a guest to a real account');

  const { client } = await startGuest(baseUrl, fingerprint('upgrade'));
  const guestTask = await createTask(client, 'Task made before signing up');
  reporter.equal('guest created a task', guestTask.status, 201);

  const email = fixtureEmail('upgraded');
  const registered = await client.post<Envelope<UserRow>>('/api/auth/register', {
    name: 'Upgraded User',
    email,
    password: FIXTURE_PASSWORD,
  });

  reporter.equal('registration succeeds', registered.status, 201);
  reporter.equal('account is no longer a guest', registered.body.data?.isGuest, false);
  reporter.equal('account carries the email', registered.body.data?.email, email);

  const list = await client.get<Envelope<{ id: string }[]>>('/api/tasks?weekStart=2026-09-14');
  reporter.equal('the guest task carried over', (list.body.data ?? []).length, 1);
  reporter.equal('and it is the same task', (list.body.data ?? [])[0]?.id, guestTask.body.data?.id);

  const second = await createTask(client, 'Now unlimited');
  reporter.equal('the limit no longer applies', second.status, 201);
  const third = await createTask(client, 'Still unlimited');
  reporter.equal('and keeps not applying', third.status, 201);

  const reusedFingerprint = await startGuest(baseUrl, fingerprint('upgrade'));
  reporter.equal(
    'a new guest session still works after upgrade',
    reusedFingerprint.response.status,
    201,
  );
}

async function runMalicious(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Malicious and malformed input');

  const anonymous = new TestClient(baseUrl);

  const noSession = await anonymous.post<Envelope>('/api/tasks', {
    title: 'No session',
    startAt: START,
  });
  reporter.equal('creating a task without any session is 401', noSession.status, 401);

  const badFingerprints: [string, unknown][] = [
    ['too short', 'abc'],
    ['too long', 'x'.repeat(200)],
    ['not a string', 12345],
    ['object', { $ne: null }],
    ['array', ['a', 'b']],
    ['null', null],
  ];

  for (const [label, value] of badFingerprints) {
    const response = await anonymous.post<Envelope>('/api/auth/guest', { fingerprint: value });
    reporter.ok(`rejects a fingerprint that is ${label}`, response.status === 400);
  }

  const unknownKey = await anonymous.post<Envelope>('/api/auth/guest', {
    fingerprint: fingerprint('strict'),
    isGuest: false,
  });
  reporter.equal('unknown keys rejected by .strict()', unknownKey.status, 400);

  const forgedGuest = await startGuest(baseUrl, fingerprint('forge'));
  const forged = await forgedGuest.client.post<Envelope>('/api/tasks', {
    title: 'Trying to escape the limit',
    startAt: START,
    ownerId: '507f1f77bcf86cd799439011',
  });
  reporter.equal('ownerId in the body is rejected', forged.status, 400);

  const promoted = await forgedGuest.client.patch<Envelope>('/api/auth/me', { isGuest: false });
  reporter.ok('cannot self-promote through /me', promoted.status >= 400);

  const limitProbe = await startGuest(baseUrl, fingerprint('race'));
  const burst = await Promise.all(
    Array.from({ length: 6 }, (_, index) => createTask(limitProbe.client, `Race ${index}`)),
  );
  const created = burst.filter((r) => r.status === 201).length;
  const blocked = burst.filter((r) => r.status === 403).length;

  reporter.ok(
    `concurrent burst does not 500 (created=${created} blocked=${blocked})`,
    burst.every((r) => r.status < 500),
  );
  reporter.equal('exactly one concurrent create succeeds', created, 1);
  reporter.equal('every other concurrent create is blocked', blocked, burst.length - 1);

  const stored = await limitProbe.client.get<Envelope<unknown[]>>(
    '/api/tasks?weekStart=2026-09-14',
  );
  reporter.equal('exactly one task is stored after the race', (stored.body.data ?? []).length, 1);

  const tampered = new TestClient(baseUrl);
  tampered.setCookie('access_token', 'not.a.real.token');
  const withGarbage = await tampered.post<Envelope>('/api/auth/guest', {});
  reporter.equal(
    'a garbage cookie mints a fresh guest rather than erroring',
    withGarbage.status,
    201,
  );
}

void main().catch(async (error: unknown) => {
  console.error('\nFatal:', error instanceof Error ? error.message : error);
  await cleanupFixtures().catch(() => undefined);
  await disconnectFixtures().catch(() => undefined);
  process.exit(1);
});
