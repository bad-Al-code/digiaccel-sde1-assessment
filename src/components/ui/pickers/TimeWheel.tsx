'use client';

import { useEffect, useRef } from 'react';

interface TimeWheelProps {
  label: string;
  options: string[];
  value: string;
  onSelect: (value: string) => void;
}

export function TimeWheel({ label, options, value, onSelect }: TimeWheelProps) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [value]);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="text-caption text-ink-muted text-center">{label}</span>
      <div
        role="listbox"
        aria-label={label}
        className="bg-background h-40 snap-y snap-mandatory [scrollbar-width:none] overflow-y-auto overscroll-contain scroll-smooth rounded-md py-16 [&::-webkit-scrollbar]:hidden"
      >
        {options.map((option) => {
          const active = option === value;

          return (
            <button
              key={option}
              ref={active ? activeRef : undefined}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(option)}
              className={[
                'text-task flex h-10 w-full snap-center items-center justify-center transition-colors duration-150',
                active ? 'text-primary font-semibold' : 'text-ink-soft hover:text-ink',
              ].join(' ')}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
