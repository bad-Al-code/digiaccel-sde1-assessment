'use client';

import { useId, useState } from 'react';
import { ClockIcon } from '../icons';
import { FIELD_BASE_CLASSES, FieldShell } from '../FieldShell';
import { Popover } from './Popover';
import { TimeWheel } from './TimeWheel';

interface TimePickerFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  allowClear?: boolean;
  align?: 'left' | 'right';
}

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function displayTime(value: string): string {
  if (!value) return '';

  const [hour = '00', minute = '00'] = value.split(':');
  const hourNumber = Number(hour);
  const suffix = hourNumber >= 12 ? 'PM' : 'AM';
  const displayHour = hourNumber % 12 === 0 ? 12 : hourNumber % 12;

  return `${String(displayHour).padStart(2, '0')}:${minute} ${suffix}`;
}

export function TimePickerField({
  label,
  placeholder = 'Start',
  value,
  onChange,
  error,
  allowClear = false,
  align = 'left',
}: TimePickerFieldProps) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);

  const [hour = '09', minute = '00'] = value ? value.split(':') : [];

  const update = (nextHour: string, nextMinute: string) => {
    onChange(`${nextHour}:${nextMinute}`);
  };

  return (
    <FieldShell
      label={label}
      htmlFor={fieldId}
      error={error}
      errorId={`${fieldId}-error`}
      className="min-w-0 flex-1"
    >
      <div className="relative">
        <button
          id={fieldId}
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={[FIELD_BASE_CLASSES, 'flex h-12 items-center gap-2.5 pl-4 text-left'].join(
            ' ',
          )}
        >
          <ClockIcon className="text-ink-muted size-5 shrink-0" />
          <span className={value ? 'text-ink' : 'text-ink-muted'}>
            {value ? displayTime(value) : placeholder}
          </span>
        </button>

        <Popover
          open={open}
          onClose={() => setOpen(false)}
          align={align}
          widthClassName="w-[15rem]"
        >
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <TimeWheel
                label="Hour"
                options={HOURS}
                value={hour}
                onSelect={(next) => update(next, minute)}
              />
              <TimeWheel
                label="Minute"
                options={MINUTES}
                value={minute}
                onSelect={(next) => update(hour, next)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              {allowClear ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="text-field-label text-ink-soft hover:bg-line-soft h-9 flex-1 rounded-sm font-medium transition-colors duration-150"
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-primary text-field-label text-surface hover:bg-primary-strong h-9 flex-1 rounded-sm font-medium transition-colors duration-150"
              >
                Done
              </button>
            </div>
          </div>
        </Popover>
      </div>
    </FieldShell>
  );
}
