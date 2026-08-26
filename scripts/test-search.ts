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
  code?: string;
  errors?: { field: string; message: string }[];
  meta?: { total?: number };
}

const WEEK = '2026-05-04';

async function main(): Promise<void> {
  const { uri, dbName } = loadTestEnv();
  registerCleanupHooks();

  const reporter = new Reporter();
  console.log('\nSearch behaviour and injection safety');
  console.log(`  database: ${dbName}`);

  await connectFixtures(uri, dbName);
  await cleanupFixtures();

  const server = await startTestServer(dbName, 3323);

  try {
    await runMatching(reporter, server.baseUrl);
    await runInjection(reporter, server.baseUrl);
    await runValidation(reporter, server.baseUrl);
    await runIsolation(reporter, server.baseUrl);
  } finally {
    await server.stop();
    const removed = await cleanupFixtures();
    console.log(`\n  cleaned up ${removed} fixture user(s)`);
    await disconnectFixtures();
  }

  reporter.summary('Search');
}

async function seedCorpus(client: TestClient): Promise<void> {
  const rows: [string, string | null][] = [
    ['Finishing Wireframe', 'Wrap up the low fidelity screens'],
    ['Meeting with team', null],
    ['Buy a cat food', 'Salmon flavour preferred'],
    ['Finishing daily commission', 'The last one for May'],
    ['UPPERCASE TITLE', 'lowercase description here'],
    ['Special chars .* [ ] ( ) $ ^', 'literal metacharacters in the title'],
    ['Backslash \\ path', 'contains a backslash'],
    ['Café résumé', 'accented characters'],
  ];

  let day = 4;
  for (const [title, description] of rows) {
    await seedTask(client, {
      title,
      description,
      startAt: `2026-05-${String(day).padStart(2, '0')}T09:00:00.000Z`,
    });
    day += 1;
  }
}

async function search(client: TestClient, term: string) {
  return client.get<Envelope<TaskRecord[]>>(`/api/tasks/search?q=${encodeURIComponent(term)}`);
}

async function runMatching(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Matching');
  const { client } = await createSession(baseUrl, 'search');
  await seedCorpus(client);

  const prefix = await search(client, 'Finish');
  reporter.equal('search returns 200', prefix.status, 200);
  const titles = (prefix.body.data ?? []).map((t) => t.title);
  reporter.ok('"Finish" matches "Finishing Wireframe"', titles.includes('Finishing Wireframe'));
  reporter.equal('"Finish" matches both finishing tasks', titles.length, 2);

  const middle = await search(client, 'ireframe');
  reporter.equal(
    'matches a substring from the middle of a word',
    (middle.body.data ?? []).length,
    1,
  );

  const lower = await search(client, 'uppercase');
  reporter.equal('lowercase term matches an uppercase title', (lower.body.data ?? []).length, 1);

  const upper = await search(client, 'LOWERCASE');
  reporter.equal(
    'uppercase term matches a lowercase description',
    (upper.body.data ?? []).length,
    1,
  );

  const description = await search(client, 'salmon');
  reporter.equal('matches inside the description', (description.body.data ?? []).length, 1);
  reporter.equal('and it is the right task', description.body.data?.[0]?.title, 'Buy a cat food');

  const nullDescription = await search(client, 'Meeting');
  reporter.equal(
    'a task with a null description is still matchable',
    (nullDescription.body.data ?? []).length,
    1,
  );

  const accented = await search(client, 'Café');
  reporter.equal('accented characters match', (accented.body.data ?? []).length, 1);

  const none = await search(client, 'zzzzzznotpresent');
  reporter.equal('no matches returns 200', none.status, 200);
  reporter.equal('no matches returns an empty array', (none.body.data ?? []).length, 0);
  reporter.ok('no matches is not an error', none.body.success === true);

  const sorted = await search(client, 'i');
  const startTimes = (sorted.body.data ?? []).map((t) => t.startAt);
  const ascending = [...startTimes].sort();
  reporter.equal('results are sorted by startAt', startTimes.join(','), ascending.join(','));

  const meta = await client.get<Envelope<TaskRecord[]>>('/api/tasks/search?q=Finish&limit=1');
  reporter.equal('search respects limit', (meta.body.data ?? []).length, 1);
  reporter.equal('search total counts all matches, not the page', meta.body.meta?.total, 2);
}

async function runInjection(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Regex injection safety');
  const { client } = await createSession(baseUrl, 'inject');
  await seedCorpus(client);

  const total = 8;

  const wildcard = await search(client, '.*');
  reporter.equal('".*" returns 200', wildcard.status, 200);
  reporter.ok(
    '".*" is treated literally and does not return everything',
    (wildcard.body.data ?? []).length < total,
  );
  reporter.equal(
    '".*" matches only the row that literally contains it',
    (wildcard.body.data ?? []).length,
    1,
  );

  const anchor = await search(client, '^');
  reporter.ok('"^" does not match everything', (anchor.body.data ?? []).length < total);

  const dollar = await search(client, '$');
  reporter.ok('"$" does not match everything', (dollar.body.data ?? []).length < total);

  const bracket = await search(client, '[');
  reporter.equal('an unclosed "[" does not error', bracket.status, 200);

  const paren = await search(client, '(');
  reporter.equal('an unclosed "(" does not error', paren.status, 200);

  const backslash = await search(client, '\\');
  reporter.equal('a lone backslash does not error', backslash.status, 200);
  reporter.equal('and matches the row containing one', (backslash.body.data ?? []).length, 1);

  const alternation = await search(client, 'Finish|Meeting');
  reporter.equal('alternation is literal, not an OR', (alternation.body.data ?? []).length, 0);

  const evil = 'a'.repeat(30) + '(a+)+$';
  const started = Date.now();
  const backtracking = await search(client, evil);
  const elapsed = Date.now() - started;

  reporter.equal('a backtracking pattern returns 200', backtracking.status, 200);
  reporter.ok(`and completes quickly (${elapsed}ms)`, elapsed < 5_000);
  reporter.equal('and matches nothing', (backtracking.body.data ?? []).length, 0);

  const nested = await search(client, '(((((((((.*)))))))))');
  reporter.equal('deeply nested groups do not error', nested.status, 200);

  const operator = await client.get<Envelope>('/api/tasks/search?q[$ne]=null');
  reporter.ok('an operator-shaped query parameter never returns 500', operator.status < 500);
  reporter.ok('and does not succeed', operator.status !== 200);
}

async function runValidation(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Search validation');
  const { client } = await createSession(baseUrl, 'searchvalid');

  const missing = await client.get<Envelope>('/api/tasks/search');
  reporter.equal('missing q returns 400', missing.status, 400);

  const blank = await client.get<Envelope>('/api/tasks/search?q=');
  reporter.equal('empty q returns 400', blank.status, 400);
  reporter.ok(
    'error names the q field',
    (blank.body.errors ?? []).some((e) => e.field === 'q'),
  );

  const whitespace = await client.get<Envelope>('/api/tasks/search?q=%20%20%20');
  reporter.equal('whitespace-only q returns 400 after trim', whitespace.status, 400);

  const tooLong = await client.get<Envelope>(`/api/tasks/search?q=${'a'.repeat(121)}`);
  reporter.equal('q over 120 characters returns 400', tooLong.status, 400);

  const atLimit = await client.get<Envelope>(`/api/tasks/search?q=${'a'.repeat(120)}`);
  reporter.equal('q of exactly 120 characters is accepted', atLimit.status, 200);

  const unknownKey = await client.get<Envelope>('/api/tasks/search?q=test&bogus=1');
  reporter.equal('unknown query key rejected', unknownKey.status, 400);

  const badLimit = await client.get<Envelope>('/api/tasks/search?q=test&limit=101');
  reporter.equal('limit above the cap returns 400', badLimit.status, 400);
}

async function runIsolation(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Search isolation');

  const owner = await createSession(baseUrl, 'searchowner');
  const stranger = await createSession(baseUrl, 'searchstranger');

  await seedTask(owner.client, {
    title: 'Confidential salary review',
    description: 'Only the owner should ever see this',
    startAt: `${WEEK}T09:00:00.000Z`,
  });

  const byOwner = await search(owner.client, 'Confidential');
  reporter.equal('the owner finds their own task', (byOwner.body.data ?? []).length, 1);

  const byStranger = await search(stranger.client, 'Confidential');
  reporter.equal('another user finds nothing', (byStranger.body.data ?? []).length, 0);
  reporter.equal('and still gets a 200', byStranger.status, 200);
  reporter.equal('and a zero total', byStranger.body.meta?.total, 0);

  const broad = await search(stranger.client, 'a');
  reporter.equal('a broad term never leaks another owner rows', (broad.body.data ?? []).length, 0);

  const anonymous = await createSession(baseUrl, 'searchanon');
  anonymous.client.clearCookies();
  const unauthenticated = await search(anonymous.client, 'Confidential');
  reporter.equal('search requires authentication', unauthenticated.status, 401);
}

void main().catch(async (error: unknown) => {
  console.error('\nFatal:', error instanceof Error ? error.message : error);
  await cleanupFixtures().catch(() => undefined);
  await disconnectFixtures().catch(() => undefined);
  process.exit(1);
});
