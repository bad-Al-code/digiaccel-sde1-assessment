import { createRouteHandler } from '@/server/core/route-handler';
import { database } from '@/server/database/connection';
import { healthController } from '@/server/modules/health';

export const dynamic = 'force-dynamic';

export const GET = createRouteHandler({}, async () => {
  await database.connect().catch(() => undefined);

  const response = await healthController.readiness();
  response.headers.set('Cache-Control', 'no-store');

  return response;
});
