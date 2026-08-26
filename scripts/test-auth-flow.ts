import jwt from 'jsonwebtoken';
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

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

interface Envelope {
  success: boolean;
  data?: unknown;
  message?: string;
  code?: string;
  errors?: { field: string; message: string }[];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted[middle] ?? 0;
}

async function main(): Promise<void> {
  const { uri, dbName } = loadTestEnv();
  registerCleanupHooks();

  const reporter = new Reporter();
  console.log('\nAuth flow edge cases');
  console.log(`  database: ${dbName}`);

  await connectFixtures(uri, dbName);
  await cleanupFixtures();

  const server = await startTestServer(dbName);
  const client = new TestClient(server.baseUrl);

  try {
    await runRegistration(reporter, client);
    await runLogin(reporter, client);
    await runSession(reporter, client);
    await runRefreshRotation(reporter, server.baseUrl);
    await runLogout(reporter, server.baseUrl);
    await runRateLimit(reporter, server.baseUrl);
  } finally {
    await server.stop();
    const removed = await cleanupFixtures();
    console.log(`\n  cleaned up ${removed} fixture user(s)`);
    await disconnectFixtures();
  }

  reporter.summary('Auth flow');
}

async function runRegistration(reporter: Reporter, client: TestClient): Promise<void> {
  reporter.group('Registration');

  const email = fixtureEmail('register');
  const created = await client.post<Envelope>('/api/auth/register', {
    name: 'Probe User',
    email,
    password: FIXTURE_PASSWORD,
  });

  reporter.equal('valid registration returns 201', created.status, 201);
  reporter.ok('envelope success is true', created.body.success === true);
  reporter.ok('no passwordHash anywhere in the response', !/passwordHash/i.test(created.raw));
  reporter.ok('no refreshTokenHash in the response', !/refreshTokenHash/i.test(created.raw));
  reporter.ok('sets an access cookie', client.getCookie(ACCESS_COOKIE) !== null);
  reporter.ok('sets a refresh cookie', client.getCookie(REFRESH_COOKIE) !== null);

  const setCookies = created.headers.getSetCookie?.() ?? [];
  reporter.ok(
    'both cookies are HttpOnly',
    setCookies.length === 2 && setCookies.every((c) => /httponly/i.test(c)),
  );
  reporter.ok(
    'both cookies are SameSite=Lax',
    setCookies.every((c) => /samesite=lax/i.test(c)),
  );

  const duplicate = await client.post<Envelope>('/api/auth/register', {
    name: 'Dup',
    email,
    password: FIXTURE_PASSWORD,
  });
  reporter.equal('duplicate email returns 409', duplicate.status, 409);
  reporter.equal(
    'duplicate uses EMAIL_ALREADY_REGISTERED',
    duplicate.body.code,
    'EMAIL_ALREADY_REGISTERED',
  );

  const casing = await client.post<Envelope>('/api/auth/register', {
    name: 'Case',
    email: email.toUpperCase(),
    password: FIXTURE_PASSWORD,
  });
  reporter.equal('different casing is still a duplicate', casing.status, 409);

  const short = await client.post<Envelope>('/api/auth/register', {
    name: 'Short',
    email: fixtureEmail('short'),
    password: 'abc',
  });
  reporter.equal('password under 8 characters returns 400', short.status, 400);

  const long = await client.post<Envelope>('/api/auth/register', {
    name: 'Long',
    email: fixtureEmail('long'),
    password: 'a'.repeat(73),
  });
  reporter.equal('password over 72 bytes returns 400', long.status, 400);

  const emojiPassword = 'a'.repeat(20) + '\u{1F600}'.repeat(14);
  const emoji = await client.post<Envelope>('/api/auth/register', {
    name: 'Emoji',
    email: fixtureEmail('emoji'),
    password: emojiPassword,
  });
  reporter.ok(
    `multi-byte password over 72 bytes rejected (${Buffer.byteLength(emojiPassword)} bytes)`,
    emoji.status === 400,
  );

  const badEmail = await client.post<Envelope>('/api/auth/register', {
    name: 'Bad',
    email: 'not-an-email',
    password: FIXTURE_PASSWORD,
  });
  reporter.equal('malformed email returns 400', badEmail.status, 400);
  reporter.ok(
    'validation error names the email field',
    (badEmail.body.errors ?? []).some((e) => e.field === 'email'),
  );

  const unknownKey = await client.post<Envelope>('/api/auth/register', {
    name: 'Extra',
    email: fixtureEmail('extra'),
    password: FIXTURE_PASSWORD,
    isAdmin: true,
  });
  reporter.equal('unknown key rejected by .strict()', unknownKey.status, 400);
}

async function runLogin(reporter: Reporter, client: TestClient): Promise<void> {
  reporter.group('Login');

  const email = fixtureEmail('login');
  await client.post('/api/auth/register', {
    name: 'Login User',
    email,
    password: FIXTURE_PASSWORD,
  });
  client.clearCookies();

  const good = await client.post<Envelope>('/api/auth/login', {
    email,
    password: FIXTURE_PASSWORD,
  });
  reporter.equal('correct credentials return 200', good.status, 200);
  reporter.ok('login sets cookies', client.getCookie(ACCESS_COOKIE) !== null);

  const wrongPassword = await client.post<Envelope>('/api/auth/login', {
    email,
    password: 'definitely-wrong-password',
  });
  const unknownEmail = await client.post<Envelope>('/api/auth/login', {
    email: fixtureEmail('ghost'),
    password: FIXTURE_PASSWORD,
  });

  reporter.equal('wrong password returns 401', wrongPassword.status, 401);
  reporter.equal('unknown email returns 401', unknownEmail.status, 401);
  reporter.equal(
    'both failures use the identical code',
    wrongPassword.body.code,
    unknownEmail.body.code,
  );
  reporter.equal(
    'both failures use the identical message',
    wrongPassword.body.message,
    unknownEmail.body.message,
  );
  reporter.equal(
    'failure code is INVALID_CREDENTIALS',
    wrongPassword.body.code,
    'INVALID_CREDENTIALS',
  );

  const wrongTimes: number[] = [];
  const unknownTimes: number[] = [];

  for (let i = 0; i < 5; i += 1) {
    let started = Date.now();
    await client.post('/api/auth/login', { email, password: 'wrong-password-here' });
    wrongTimes.push(Date.now() - started);

    started = Date.now();
    await client.post('/api/auth/login', {
      email: fixtureEmail('ghost'),
      password: FIXTURE_PASSWORD,
    });
    unknownTimes.push(Date.now() - started);
  }

  const wrongMedian = median(wrongTimes);
  const unknownMedian = median(unknownTimes);
  const ratio = wrongMedian === 0 ? 0 : unknownMedian / wrongMedian;

  reporter.ok(
    `unknown-email timing is comparable to wrong-password (${unknownMedian}ms vs ${wrongMedian}ms, ratio ${ratio.toFixed(2)})`,
    ratio > 0.3 && ratio < 3,
  );
}

async function runSession(reporter: Reporter, client: TestClient): Promise<void> {
  reporter.group('Session');

  const authed = await client.get<Envelope>('/api/auth/me');
  reporter.equal('me with cookies returns 200', authed.status, 200);
  reporter.ok(
    'me returns no credential fields',
    !/passwordHash|refreshTokenHash/i.test(authed.raw),
  );

  const saved = client.snapshotCookies();

  client.clearCookies();
  const anonymous = await client.get<Envelope>('/api/auth/me');
  reporter.equal('me without cookies returns 401', anonymous.status, 401);
  reporter.equal('anonymous code is UNAUTHENTICATED', anonymous.body.code, 'UNAUTHENTICATED');

  const accessSecret = process.env.JWT_ACCESS_SECRET as string;
  const refreshSecret = process.env.JWT_REFRESH_SECRET as string;
  const userId = '507f1f77bcf86cd799439011';

  client.setCookie(ACCESS_COOKIE, `${saved.get(ACCESS_COOKIE)}tampered`);
  const tampered = await client.get<Envelope>('/api/auth/me');
  reporter.equal('tampered signature returns 401', tampered.status, 401);

  client.clearCookies();
  client.setCookie(
    ACCESS_COOKIE,
    jwt.sign({ sub: userId, type: 'access' }, accessSecret, {
      algorithm: 'HS256',
      issuer: 'todo-app',
      audience: 'todo-app-client',
      expiresIn: '-10m',
    }),
  );
  const expired = await client.get<Envelope>('/api/auth/me');
  reporter.equal('expired token returns 401', expired.status, 401);
  reporter.equal('expired token reports SESSION_EXPIRED', expired.body.code, 'SESSION_EXPIRED');

  client.clearCookies();
  client.setCookie(
    ACCESS_COOKIE,
    jwt.sign({ sub: userId, type: 'refresh' }, refreshSecret, {
      algorithm: 'HS256',
      issuer: 'todo-app',
      audience: 'todo-app-client',
      expiresIn: '30d',
    }),
  );
  const crossType = await client.get<Envelope>('/api/auth/me');
  reporter.equal('refresh token rejected as access token', crossType.status, 401);

  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, type: 'access', iss: 'todo-app', aud: 'todo-app-client' }),
  ).toString('base64url');

  client.clearCookies();
  client.setCookie(ACCESS_COOKIE, `${header}.${payload}.`);
  const algNone = await client.get<Envelope>('/api/auth/me');
  reporter.equal('alg:none token returns 401', algNone.status, 401);

  client.clearCookies();
  client.setCookie(ACCESS_COOKIE, 'not.a.jwt');
  const malformed = await client.get<Envelope>('/api/auth/me');
  reporter.equal('malformed token returns 401 not 500', malformed.status, 401);

  client.restoreCookies(saved);
}

async function runRefreshRotation(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Refresh and rotation');

  const client = new TestClient(baseUrl);
  const email = fixtureEmail('rotate');
  await client.post('/api/auth/register', { name: 'Rotate', email, password: FIXTURE_PASSWORD });

  const original = client.getCookie(REFRESH_COOKIE) as string;

  const refreshed = await client.post<Envelope>('/api/auth/refresh');
  reporter.equal('refresh returns 200', refreshed.status, 200);

  const rotated = client.getCookie(REFRESH_COOKIE) as string;
  reporter.ok('refresh issues a new refresh token', rotated !== original);

  const replay = new TestClient(baseUrl);
  replay.setCookie(REFRESH_COOKIE, original);
  const replayed = await replay.post<Envelope>('/api/auth/refresh');
  reporter.equal('replaying the previous refresh token returns 401', replayed.status, 401);

  const afterReuse = await client.post<Envelope>('/api/auth/refresh');
  reporter.equal('reuse detection invalidates the live session too', afterReuse.status, 401);

  const noCookie = new TestClient(baseUrl);
  const bare = await noCookie.post<Envelope>('/api/auth/refresh');
  reporter.equal('refresh without a cookie returns 401', bare.status, 401);
}

async function runLogout(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Logout');

  const client = new TestClient(baseUrl);
  const email = fixtureEmail('logout');
  await client.post('/api/auth/register', { name: 'Logout', email, password: FIXTURE_PASSWORD });

  const refreshToken = client.getCookie(REFRESH_COOKIE) as string;

  const out = await client.post<Envelope>('/api/auth/logout');
  reporter.equal('logout returns 200', out.status, 200);
  reporter.ok('access cookie cleared', client.getCookie(ACCESS_COOKIE) === null);
  reporter.ok('refresh cookie cleared', client.getCookie(REFRESH_COOKIE) === null);

  const captured = new TestClient(baseUrl);
  captured.setCookie(REFRESH_COOKIE, refreshToken);
  const afterLogout = await captured.post<Envelope>('/api/auth/refresh');
  reporter.equal('captured refresh token is dead after logout', afterLogout.status, 401);

  const empty = new TestClient(baseUrl);
  const noSession = await empty.post<Envelope>('/api/auth/logout');
  reporter.equal('logout without a session returns 200', noSession.status, 200);
}

async function runRateLimit(reporter: Reporter, baseUrl: string): Promise<void> {
  reporter.group('Rate limiting');

  const headers = { 'x-forwarded-for': '203.0.113.55, 10.0.0.1' };
  const client = new TestClient(baseUrl);

  let limited: Awaited<ReturnType<TestClient['post']>> | null = null;

  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const response = await client.post<Envelope>(
      '/api/auth/login',
      { email: fixtureEmail('ratelimit'), password: 'wrong-password' },
      headers,
    );

    if (response.status === 429) {
      limited = response;
      reporter.ok(`rate limit trips on attempt ${attempt} (policy allows 10)`, attempt === 11);
      break;
    }
  }

  reporter.ok('a 429 was returned', limited !== null);
  reporter.equal(
    '429 uses RATE_LIMITED',
    (limited?.body as Envelope | undefined)?.code,
    'RATE_LIMITED',
  );
  reporter.ok('429 sets Retry-After', Number(limited?.headers.get('retry-after') ?? 0) > 0);

  const other = new TestClient(baseUrl);
  const otherIp = await other.post<Envelope>(
    '/api/auth/login',
    { email: fixtureEmail('other'), password: 'wrong-password' },
    { 'x-forwarded-for': '198.51.100.77' },
  );
  reporter.ok('a different IP is not rate limited', otherIp.status !== 429);
}

void main().catch(async (error: unknown) => {
  console.error('\nFatal:', error instanceof Error ? error.message : error);
  await cleanupFixtures().catch(() => undefined);
  await disconnectFixtures().catch(() => undefined);
  process.exit(1);
});
