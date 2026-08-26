import { TaskController } from './task.controller';
import { UserRepository } from '@/server/modules/auth/user.repository';
import { TaskRepository } from './task.repository';
import { TaskService } from './services/task.service';
import { WeekService } from './services/week.service';

const taskRepository = new TaskRepository();
const guestQuota = new UserRepository();
const taskService = new TaskService(taskRepository, {
  reserve: (ownerId, maxTasks) => guestQuota.reserveGuestTaskSlot(ownerId, maxTasks),
  release: (ownerId) => guestQuota.releaseGuestTaskSlot(ownerId),
});
const weekService = new WeekService(taskRepository);

export const taskController = new TaskController(taskService, weekService);
