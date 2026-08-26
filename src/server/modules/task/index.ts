import { TaskController } from './task.controller';
import { TaskRepository } from './task.repository';
import { TaskService } from './services/task.service';
import { WeekService } from './services/week.service';

const taskRepository = new TaskRepository();
const taskService = new TaskService(taskRepository);
const weekService = new WeekService(taskRepository);

export const taskController = new TaskController(taskService, weekService);
