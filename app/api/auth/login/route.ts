import { AUTH_ATTEMPTS } from '@/server/core/rate-limiter';
import { createRouteHandler } from '@/server/core/route-handler';
import { database } from '@/server/database/connection';
import { authController } from '@/server/modules/auth';
import { loginSchema } from '@/server/modules/auth/auth.validator';

export const dynamic = 'force-dynamic';

export const POST = createRouteHandler(
  { body: loginSchema, rateLimit: AUTH_ATTEMPTS },
  async ({ request, body }) => {
    await database.connect();

    return authController.login(request, body);
  },
);
