import { createRouteHandler } from '@/server/core/route-handler';
import { healthController } from '@/server/modules/health';

export const dynamic = 'force-dynamic';

export const GET = createRouteHandler({}, async () => {
  const response = healthController.liveness();
  response.headers.set('Cache-Control', 'no-store');

  return response;
});
