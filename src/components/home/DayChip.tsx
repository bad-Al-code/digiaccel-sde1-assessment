interface DayChipProps {
  date: Date;
  selected: boolean;
  isToday: boolean;
  onSelect: (date: Date) => void;
}

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });

export function DayChip({ date, selected, isToday, onSelect }: DayChipProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      aria-pressed={selected}
      className={[
        'flex h-[66px] w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-md',
        'focus-visible:ring-primary transition-[background-color,transform,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:ring-2 focus-visible:outline-none',
        'active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100',
        selected ? 'bg-primary scale-105' : 'hover:bg-complete-surface scale-100 bg-transparent',
      ].join(' ')}
    >
      <span className={['text-caption', selected ? 'text-surface/80' : 'text-ink-muted'].join(' ')}>
        {WEEKDAY.format(date)}
      </span>
      <span
        className={[
          'text-day-number font-semibold',
          selected ? 'text-surface' : 'text-ink-muted',
        ].join(' ')}
      >
        {String(date.getDate()).padStart(2, '0')}
      </span>
      <span
        aria-hidden="true"
        className={[
          'size-1 rounded-full',
          selected ? 'bg-surface' : isToday ? 'bg-primary' : 'bg-transparent',
        ].join(' ')}
      />
    </button>
  );
}
