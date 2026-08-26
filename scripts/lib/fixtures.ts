import mongoose from 'mongoose';

export const FIXTURE_EMAIL_DOMAIN = '@fixture.test';

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let sequence = 0;

export function fixtureEmail(label = 'user'): string {
  sequence += 1;
  return `${label}-${RUN_ID}-${sequence}${FIXTURE_EMAIL_DOMAIN}`;
}

export const FIXTURE_PASSWORD = 'correct-horse-battery';

export async function connectFixtures(uri: string, dbName: string): Promise<void> {
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 8_000 });
}

export async function cleanupFixtures(): Promise<number> {
  const connection = mongoose.connection;

  if (connection.readyState !== 1 || !connection.db) return 0;

  const users = connection.db.collection('users');
  const tasks = connection.db.collection('tasks');

  const owners = await users
    .find({ email: { $regex: `${FIXTURE_EMAIL_DOMAIN.replace('.', '\\.')}$` } })
    .project({ _id: 1 })
    .toArray();

  if (owners.length === 0) return 0;

  const ownerIds = owners.map((owner) => owner._id);
  await tasks.deleteMany({ ownerId: { $in: ownerIds } });
  const result = await users.deleteMany({ _id: { $in: ownerIds } });

  return result.deletedCount ?? 0;
}

export async function disconnectFixtures(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function registerCleanupHooks(): void {
  const run = async () => {
    try {
      await cleanupFixtures();
      await disconnectFixtures();
    } catch {}
  };

  process.once('SIGINT', () => {
    void run().then(() => process.exit(130));
  });

  process.once('SIGTERM', () => {
    void run().then(() => process.exit(143));
  });
}
