export const TaskStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TASK_STATUS_VALUES = Object.values(TaskStatus);
export const TASK_PRIORITY_VALUES = Object.values(TaskPriority);

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly startAt: string;
  readonly endAt: string | null;
  readonly status: TaskStatus;
  readonly priority: TaskPriority | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly isGuest: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const GUEST_TASK_LIMIT = 1;

export interface WeekSummary {
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly openTaskCount: number;
  readonly completedTaskCount: number;
  readonly totalTaskCount: number;
  readonly completionPercentage: number;
}
