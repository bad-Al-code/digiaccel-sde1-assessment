'use client';

import { format, isValid, parseISO } from 'date-fns';
import { useId, type Ref } from 'react';
import { CalendarIcon } from './icons';
import { FIELD_BASE_CLASSES, FieldShell } from './FieldShell';

interface DateFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  ref?: Ref<HTMLInputElement>;
}

const DISPLAY_FORMAT = 'EEEE dd, MMMM';

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';

  const parsed = parseISO(isoDate);

  return isValid(parsed) ? format(parsed, DISPLAY_FORMAT) : '';
}

export function DateField({
  label = 'Set Date',
  value,
  onChange,
  error,
  min,
  max,
  required,
  disabled,
  id,
  ref,
}: DateFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const display = formatDisplayDate(value);

  return (
    <FieldShell label={label} htmlFor={inputId} error={error} errorId={errorId}>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type="date"
          value={value}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={[
            FIELD_BASE_CLASSES,
            'h-12 pr-12',
            display ? 'text-transparent' : '',
            '[&::-webkit-calendar-picker-indicator]:absolute',
            '[&::-webkit-calendar-picker-indicator]:inset-0',
            '[&::-webkit-calendar-picker-indicator]:h-full',
            '[&::-webkit-calendar-picker-indicator]:w-full',
            '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
            '[&::-webkit-calendar-picker-indicator]:opacity-0',
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {display ? (
          <span className="text-task text-ink pointer-events-none absolute inset-y-0 left-4 flex items-center">
            {display}
          </span>
        ) : null}
        <CalendarIcon className="text-ink-muted pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" />
      </div>
    </FieldShell>
  );
}
