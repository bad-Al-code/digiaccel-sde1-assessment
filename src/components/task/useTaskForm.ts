'use client';

import { useState } from 'react';
import { combineLocalDateTime, splitLocalDateTime, toLocalDateKey } from '@/lib/local-date';
import type { Task, TaskPriority } from '@/types';

export type FieldErrors = Partial<Record<keyof TaskFormValues, string | undefined>>;

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

export interface TaskFormValues {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  priority: TaskPriority | null;
}

function emptyValues(defaultDate: Date): TaskFormValues {
  return {
    title: '',
    date: toLocalDateKey(defaultDate),
    startTime: '09:00',
    endTime: '',
    description: '',
    priority: null,
  };
}

function fromTask(task: Task): TaskFormValues {
  const start = splitLocalDateTime(task.startAt);
  const end = task.endAt ? splitLocalDateTime(task.endAt) : null;

  return {
    title: task.title,
    date: start.date,
    startTime: start.time,
    endTime: end ? end.time : '',
    description: task.description ?? '',
    priority: task.priority,
  };
}

export function useTaskForm(task: Task | null, defaultDate: Date) {
  const [values, setValues] = useState<TaskFormValues>(() =>
    task ? fromTask(task) : emptyValues(defaultDate),
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const setValue =
    <K extends keyof TaskFormValues>(key: K) =>
    (value: TaskFormValues[K]) => {
      setValues((current) => ({ ...current, [key]: value }));
      setErrors((current) => ({ ...current, [key]: undefined }));
    };

  const isDirty = values.title.trim().length > 0 || values.description.trim().length > 0;

  const toPayload = () => {
    const found: FieldErrors = {};

    if (!values.title.trim()) {
      found.title = 'Title is required';
    } else if (values.title.trim().length > TITLE_MAX) {
      found.title = `Title must be at most ${TITLE_MAX} characters`;
    }

    if (!values.date) found.date = 'Pick a date';
    if (!values.startTime) found.startTime = 'Pick a start time';

    if (values.description.length > DESCRIPTION_MAX) {
      found.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
    }

    const startAt = combineLocalDateTime(values.date, values.startTime);
    const endAt = values.endTime ? combineLocalDateTime(values.date, values.endTime) : null;

    if (endAt && values.startTime && new Date(endAt) <= new Date(startAt)) {
      found.endTime = 'Must be after the start time';
    }

    if (Object.keys(found).length > 0) {
      setErrors(found);
      return null;
    }

    return {
      title: values.title.trim(),
      description: values.description.trim() || null,
      startAt,
      endAt,
      priority: values.priority,
    };
  };

  return { values, setValue, errors, setErrors, isDirty, toPayload };
}
