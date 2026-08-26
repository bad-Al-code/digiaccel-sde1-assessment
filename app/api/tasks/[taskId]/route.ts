import { createRouteHandler } from '@/server/core/route-handler';
import { database } from '@/server/database/connection';
import { authGuard } from '@/server/modules/auth';
import { taskController } from '@/server/modules/task';
import { taskIdParamsSchema, updateTaskSchema } from '@/server/modules/task/task.validator';

export const dynamic = 'force-dynamic';

export const GET = createRouteHandler(
  { params: taskIdParamsSchema, auth: authGuard.resolveUser },
  async ({ user, params }) => {
    await database.connect();

    return taskController.get(user, params.taskId);
  },
);

export const PATCH = createRouteHandler(
  { params: taskIdParamsSchema, body: updateTaskSchema, auth: authGuard.resolveUser },
  async ({ user, params, body }) => {
    await database.connect();

    return taskController.update(user, params.taskId, body);
  },
);

export const DELETE = createRouteHandler(
  { params: taskIdParamsSchema, auth: authGuard.resolveUser },
  async ({ user, params }) => {
    await database.connect();

    return taskController.remove(user, params.taskId);
  },
);
