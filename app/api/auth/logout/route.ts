import { createRouteHandler } from '@/server/core/route-handler';
import { database } from '@/server/database/connection';
import { authController } from '@/server/modules/auth';

export const dynamic = 'force-dynamic';

export const POST = createRouteHandler({}, async ({ request }) => {
  await database.connect();

  return authController.logout(request);
});
