import { createRouteHandler } from '@/server/core/route-handler';
import { database } from '@/server/database/connection';
import { authGuard } from '@/server/modules/auth';
import { taskController } from '@/server/modules/task';
import { createTaskSchema, listTasksQuerySchema } from '@/server/modules/task/task.validator';

export const dynamic = 'force-dynamic';

export const GET = createRouteHandler(
  { query: listTasksQuerySchema, auth: authGuard.resolveUser },
  async ({ user, query }) => {
    await database.connect();

    return taskController.list(user, query);
  },
);

export const POST = createRouteHandler(
  { body: createTaskSchema, auth: authGuard.resolveUser },
  async ({ user, body }) => {
    await database.connect();

    return taskController.create(user, body);
  },
);
