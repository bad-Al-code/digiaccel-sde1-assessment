import { env } from '@/server/config/env';
import { database } from '@/server/database/connection';
import { ConfigHealthCheck } from './checks/config-health-check';
import { MongoHealthCheck } from './checks/mongo-health-check';
import { RuntimeHealthCheck } from './checks/runtime-health-check';
import { HealthController } from './health.controller';
import { HealthRegistry } from './health-registry';

const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';

const registry = new HealthRegistry(
  [new MongoHealthCheck(database), new ConfigHealthCheck(), new RuntimeHealthCheck(version)],
  version,
  env.NODE_ENV,
);

export const healthController = new HealthController(registry, version);
