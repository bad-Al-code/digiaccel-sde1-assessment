'use client';

import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DatePickerField } from '@/components/ui/pickers/DatePickerField';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { TimePickerField } from '@/components/ui/pickers/TimePickerField';
import type { Task } from '@/types';
import { PrioritySelector } from './PrioritySelector';
import { useTaskForm } from './useTaskForm';

interface TaskFormSheetProps {
  open: boolean;
  task: Task | null;
  defaultDate: Date;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ReturnType<ReturnType<typeof useTaskForm>['toPayload']>) => void;
}

export function TaskFormSheet({
  open,
  task,
  defaultDate,
  submitting,
  onClose,
  onSubmit,
}: TaskFormSheetProps) {
  return (
    <BottomSheet open={open} title={task ? 'Edit Task' : 'Add New Task'} onClose={onClose}>
      <TaskFormFields
        key={task ? `edit-${task.id}` : `new-${defaultDate.toISOString()}`}
        task={task}
        defaultDate={defaultDate}
        submitting={submitting}
        onSubmit={onSubmit}
      />
    </BottomSheet>
  );
}

interface TaskFormFieldsProps {
  task: Task | null;
  defaultDate: Date;
  submitting: boolean;
  onSubmit: TaskFormSheetProps['onSubmit'];
}

function TaskFormFields({ task, defaultDate, submitting, onSubmit }: TaskFormFieldsProps) {
  const { values, setValue, errors, toPayload } = useTaskForm(task, defaultDate);
  const isEditing = task !== null;

  const handleSubmit = () => {
    const payload = toPayload();

    if (payload) {
      onSubmit(payload);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <TextField
        label="Task title"
        value={values.title}
        onChange={(event) => setValue('title')(event.target.value)}
        placeholder="Doing Homework"
        disabled={submitting}
        {...(errors.title ? { error: errors.title } : {})}
      />

      <div className="flex flex-col gap-2">
        <span className="text-field-label text-ink-muted">Set Time</span>
        <div className="flex gap-3">
          <TimePickerField
            placeholder="Start"
            value={values.startTime}
            onChange={setValue('startTime')}
            error={errors.startTime}
          />
          <TimePickerField
            placeholder="Ends"
            value={values.endTime}
            onChange={setValue('endTime')}
            align="right"
            error={errors.endTime}
            allowClear
          />
        </div>
      </div>

      <DatePickerField value={values.date} onChange={setValue('date')} error={errors.date} />

      <TextArea
        label="Description"
        value={values.description}
        onChange={(event) => setValue('description')(event.target.value)}
        placeholder="Add Description"
        disabled={submitting}
        {...(errors.description ? { error: errors.description } : {})}
      />

      <PrioritySelector value={values.priority} onChange={setValue('priority')} />

      <Button onClick={handleSubmit} loading={submitting}>
        {isEditing ? 'Update task' : 'Create task'}
      </Button>
    </div>
  );
}
