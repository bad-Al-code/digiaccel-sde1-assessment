import { createRouteHandler } from '@/server/core/route-handler';
import { database } from '@/server/database/connection';
import { authGuard } from '@/server/modules/auth';
import { taskController } from '@/server/modules/task';
import { taskIdParamsSchema, updateStatusSchema } from '@/server/modules/task/task.validator';

export const dynamic = 'force-dynamic';

export const PATCH = createRouteHandler(
  { params: taskIdParamsSchema, body: updateStatusSchema, auth: authGuard.resolveUser },
  async ({ user, params, body }) => {
    await database.connect();

    return taskController.changeStatus(user, params.taskId, body);
  },
);
