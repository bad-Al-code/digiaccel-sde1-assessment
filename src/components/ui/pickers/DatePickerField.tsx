'use client';

import { format, isValid, parseISO } from 'date-fns';
import { useId, useState } from 'react';
import { CalendarIcon } from '../icons';
import { FIELD_BASE_CLASSES, FieldShell } from '../FieldShell';
import { Calendar } from './Calendar';
import { Popover } from './Popover';

interface DatePickerFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';

  const parsed = parseISO(isoDate);

  return isValid(parsed) ? format(parsed, 'EEEE dd, MMMM') : '';
}

export function DatePickerField({
  label = 'Set Date',
  value,
  onChange,
  error,
}: DatePickerFieldProps) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const display = formatDisplayDate(value);

  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} errorId={`${fieldId}-error`}>
      <div className="relative">
        <button
          id={fieldId}
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={[FIELD_BASE_CLASSES, 'flex h-12 items-center justify-between text-left'].join(
            ' ',
          )}
        >
          <span className={display ? 'text-ink' : 'text-ink-muted'}>
            {display || 'Pick a date'}
          </span>
          <CalendarIcon className="text-ink-muted size-5 shrink-0" />
        </button>

        <Popover open={open} onClose={() => setOpen(false)}>
          <Calendar
            value={value}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </Popover>
      </div>
    </FieldShell>
  );
}
