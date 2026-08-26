import { createRouteHandler } from '@/server/core/route-handler';
import { database } from '@/server/database/connection';
import { authGuard } from '@/server/modules/auth';
import { taskController } from '@/server/modules/task';
import { weeksQuerySchema } from '@/server/modules/task/task.validator';

export const dynamic = 'force-dynamic';

export const GET = createRouteHandler(
  { query: weeksQuerySchema, auth: authGuard.resolveUser },
  async ({ user, query }) => {
    await database.connect();

    return taskController.weeks(user, query);
  },
);
