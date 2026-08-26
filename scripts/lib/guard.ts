import { config } from 'dotenv';
import path from 'node:path';

export function loadTestEnv(): { uri: string; dbName: string } {
  config({ path: path.resolve(process.cwd(), '.env.test'), quiet: true });

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!uri || !dbName) {
    fail('MONGODB_URI and MONGODB_DB_NAME must be set. Copy .env.local to .env.test.');
  }

  if (!dbName.includes('test')) {
    fail(`Refusing to run: MONGODB_DB_NAME is "${dbName}", which is not a test database.`);
  }

  if (process.env.NODE_ENV === 'production') {
    fail('Refusing to run with NODE_ENV=production.');
  }

  return { uri, dbName };
}

function fail(message: string): never {
  console.error(`\n[guard] ${message}\n`);
  process.exit(1);
}
