import { config } from 'dotenv';
import path from 'node:path';
import mongoose from 'mongoose';

async function main(): Promise<void> {
  const envFile = process.env.SYNC_ENV_FILE ?? '.env.local';
  config({ path: path.resolve(process.cwd(), envFile), quiet: true });

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.SYNC_DB_NAME ?? process.env.MONGODB_DB_NAME;

  if (!uri || !dbName) {
    console.error('MONGODB_URI and MONGODB_DB_NAME are required');
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10_000 });
  console.log(`\nSyncing indexes on "${dbName}"`);

  const { UserModel } = await import('../src/server/database/models/user.model');
  const { TaskModel } = await import('../src/server/database/models/task.model');

  for (const model of [UserModel, TaskModel]) {
    const before = (await model.collection.indexes()).map((index) => index.name);
    const dropped = await model.syncIndexes();
    const after = (await model.collection.indexes()).map((index) => index.name);

    console.log(`\n  ${model.collection.collectionName}`);
    console.log(`    before : ${before.join(', ')}`);
    if (dropped.length > 0) console.log(`    dropped: ${dropped.join(', ')}`);
    console.log(`    after  : ${after.join(', ')}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.\n');
  process.exit(0);
}

void main().catch((error: unknown) => {
  console.error('sync failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
