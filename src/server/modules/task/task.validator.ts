import { z } from 'zod';
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from '@/types';

export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const SEARCH_TERM_MAX_LENGTH = 120;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

const MIN_TIMESTAMP = Date.UTC(1970, 0, 1);
const MAX_TIMESTAMP = Date.UTC(new Date().getUTCFullYear() + 100, 0, 1);

const isoDateTime = z.iso
  .datetime({ offset: true, message: 'Must be an ISO 8601 datetime with an offset or Z' })
  .refine((value) => {
    const time = new Date(value).getTime();
    return time >= MIN_TIMESTAMP && time <= MAX_TIMESTAMP;
  }, 'Date is outside the supported range');

const isoDate = z.iso.date('Must be an ISO 8601 date (YYYY-MM-DD)');

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(TITLE_MAX_LENGTH, `Title must be at most ${TITLE_MAX_LENGTH} characters`);

const descriptionSchema = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX_LENGTH, `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`)
  .nullable();

const prioritySchema = z.enum(TASK_PRIORITY_VALUES as [string, ...string[]]).nullable();
const statusSchema = z.enum(TASK_STATUS_VALUES as [string, ...string[]]);

export const createTaskSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    startAt: isoDateTime,
    endAt: isoDateTime.nullable().optional(),
    priority: prioritySchema.optional(),
  })
  .strict()
  .refine((value) => !value.endAt || new Date(value.endAt) > new Date(value.startAt), {
    message: 'endAt must be strictly after startAt',
    path: ['endAt'],
  });

export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    startAt: isoDateTime.optional(),
    endAt: isoDateTime.nullable().optional(),
    priority: prioritySchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  })
  .refine(
    (value) => !value.startAt || !value.endAt || new Date(value.endAt) > new Date(value.startAt),
    { message: 'endAt must be strictly after startAt', path: ['endAt'] },
  );

export const updateStatusSchema = z.object({ status: statusSchema }).strict();

export const taskIdParamsSchema = z.object({
  taskId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid task id'),
});

const paginationShape = {
  limit: z.coerce
    .number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(MAX_PAGE_SIZE, `Limit must be at most ${MAX_PAGE_SIZE}`)
    .default(DEFAULT_PAGE_SIZE),
  cursor: z.string().min(1).max(200).optional(),
};

export const listTasksQuerySchema = z
  .object({
    weekStart: isoDate.optional(),
    date: isoDate.optional(),
    status: statusSchema.optional(),
    priority: z.enum(TASK_PRIORITY_VALUES as [string, ...string[]]).optional(),
    ...paginationShape,
  })
  .strict()
  .refine((value) => !(value.weekStart && value.date), {
    message: 'Provide either weekStart or date, not both',
    path: ['date'],
  });

export const searchQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(1, 'Search term is required')
      .max(
        SEARCH_TERM_MAX_LENGTH,
        `Search term must be at most ${SEARCH_TERM_MAX_LENGTH} characters`,
      ),
    ...paginationShape,
  })
  .strict();

export const weeksQuerySchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    limit: z.coerce.number().int().min(1).max(52).default(8),
  })
  .strict()
  .refine((value) => !value.from || !value.to || new Date(value.to) >= new Date(value.from), {
    message: 'to must not be before from',
    path: ['to'],
  });

export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
export type UpdateStatusBody = z.infer<typeof updateStatusSchema>;
export type TaskIdParams = z.infer<typeof taskIdParamsSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type WeeksQuery = z.infer<typeof weeksQuerySchema>;
