'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { BackIcon } from '../icons';

interface CalendarProps {
  value: string;
  onSelect: (isoDate: string) => void;
}

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function toKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function leadingBlanks(monthStart: Date): number {
  return (monthStart.getDay() + 6) % 7;
}

export function Calendar({ value, onSelect }: CalendarProps) {
  const selected = value ? parseISO(value) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selected));
  const [direction, setDirection] = useState(0);

  const days = eachDayOfInterval({
    start: startOfMonth(visibleMonth),
    end: endOfMonth(visibleMonth),
  });

  const changeMonth = (offset: number) => {
    setDirection(offset);
    setVisibleMonth((current) => addMonths(current, offset));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <MonthButton label="Previous month" onClick={() => changeMonth(-1)} />
        <motion.span
          key={format(visibleMonth, 'yyyy-MM')}
          initial={{ opacity: 0, x: direction * 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="text-card-label text-ink font-semibold"
        >
          {format(visibleMonth, 'MMMM yyyy')}
        </motion.span>
        <MonthButton label="Next month" onClick={() => changeMonth(1)} flipped />
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-caption text-ink-muted py-1 text-center">
            {label}
          </span>
        ))}

        {Array.from({ length: leadingBlanks(startOfMonth(visibleMonth)) }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}

        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            selected={isSameDay(day, selected)}
            inMonth={isSameMonth(day, visibleMonth)}
            onSelect={() => onSelect(toKey(day))}
          />
        ))}
      </div>
    </div>
  );
}

function MonthButton({
  label,
  onClick,
  flipped = false,
}: {
  label: string;
  onClick: () => void;
  flipped?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="text-ink-soft hover:bg-complete-surface hover:text-ink focus-visible:ring-primary flex size-9 items-center justify-center rounded-md transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
    >
      <BackIcon className={['size-5', flipped ? 'rotate-180' : ''].join(' ')} />
    </button>
  );
}

function DayCell({
  day,
  selected,
  inMonth,
  onSelect,
}: {
  day: Date;
  selected: boolean;
  inMonth: boolean;
  onSelect: () => void;
}) {
  const isToday = isSameDay(day, new Date());

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={format(day, 'EEEE d MMMM yyyy')}
      className={[
        'text-card-label relative flex size-9 items-center justify-center rounded-md',
        'focus-visible:ring-primary transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none',
        selected
          ? 'bg-primary text-surface font-semibold'
          : inMonth
            ? 'text-ink hover:bg-complete-surface'
            : 'text-ink-muted',
      ].join(' ')}
    >
      {day.getDate()}
      {isToday && !selected ? (
        <span className="bg-primary absolute bottom-1 size-1 rounded-full" />
      ) : null}
    </button>
  );
}
