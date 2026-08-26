import { AUTH_ATTEMPTS } from '@/server/core/rate-limiter';
import { createRouteHandler } from '@/server/core/route-handler';
import { database } from '@/server/database/connection';
import { authController } from '@/server/modules/auth';
import { registerSchema } from '@/server/modules/auth/auth.validator';

export const dynamic = 'force-dynamic';

export const POST = createRouteHandler(
  { body: registerSchema, rateLimit: AUTH_ATTEMPTS },
  async ({ body }) => {
    await database.connect();

    return authController.register(body);
  },
);
