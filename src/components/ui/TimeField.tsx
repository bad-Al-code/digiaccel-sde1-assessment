'use client';

import { useId, type Ref } from 'react';
import { ClockIcon } from './icons';
import { FIELD_BASE_CLASSES, FieldShell } from './FieldShell';

interface TimeFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  ref?: Ref<HTMLInputElement>;
}

export function TimeField({
  label,
  placeholder = 'Start',
  value,
  onChange,
  error,
  required,
  disabled,
  id,
  ref,
}: TimeFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <FieldShell label={label} htmlFor={inputId} error={error} errorId={errorId}>
      <div className="relative">
        <ClockIcon className="text-ink-muted pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2" />
        <input
          ref={ref}
          id={inputId}
          type="time"
          value={value}
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-label={label ?? placeholder}
          className={[
            FIELD_BASE_CLASSES,
            'h-12 pl-11',
            value ? '' : 'text-transparent',
            '[&::-webkit-calendar-picker-indicator]:opacity-0',
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {value ? null : (
          <span className="text-task text-ink-muted pointer-events-none absolute inset-y-0 left-11 flex items-center">
            {placeholder}
          </span>
        )}
      </div>
    </FieldShell>
  );
}
