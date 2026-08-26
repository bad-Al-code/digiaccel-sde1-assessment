import { createRouteHandler } from '@/server/core/route-handler';
import { authController, authGuard } from '@/server/modules/auth';

export const dynamic = 'force-dynamic';

export const GET = createRouteHandler({ auth: authGuard.resolveUser }, async ({ user }) =>
  authController.me(user),
);
