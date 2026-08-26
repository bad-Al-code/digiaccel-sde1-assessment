import { AUTH_ATTEMPTS } from '@/server/core/rate-limiter';
import { createRouteHandler } from '@/server/core/route-handler';
import { database } from '@/server/database/connection';
import { authController } from '@/server/modules/auth';

export const dynamic = 'force-dynamic';

export const POST = createRouteHandler({ rateLimit: AUTH_ATTEMPTS }, async ({ request }) => {
  await database.connect();

  return authController.refresh(request);
});
