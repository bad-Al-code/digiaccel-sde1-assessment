'use client';

import { useEffect, useMemo, useRef } from 'react';
import { addLocalDays, fromLocalDateKey, toLocalDateKey } from '@/lib/local-date';
import { animateScrollLeft } from '@/lib/smooth-scroll';
import { DayChip } from './DayChip';

interface DayStripProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
  anchorDate?: Date;
  daysBefore?: number;
  daysAfter?: number;
}

export function DayStrip({
  selectedDate,
  onSelect,
  anchorDate,
  daysBefore = 14,
  daysAfter = 14,
}: DayStripProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const hasCentredOnce = useRef(false);
  const today = new Date();

  const anchorKey = toLocalDateKey(anchorDate ?? today);

  const days = useMemo(() => {
    return Array.from({ length: daysBefore + daysAfter + 1 }, (_, index) =>
      fromLocalDateKey(addLocalDays(anchorKey, index - daysBefore)),
    );
  }, [anchorKey, daysBefore, daysAfter]);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) return;

    let cancelled = false;
    let cancelScroll: (() => void) | null = null;

    const centreSelected = (smooth: boolean) => {
      const chip = selectedRef.current;

      if (cancelled || !chip || scroller.clientWidth === 0) return;

      const scrollerBox = scroller.getBoundingClientRect();
      const chipBox = chip.getBoundingClientRect();
      const chipStart = scroller.scrollLeft + (chipBox.left - scrollerBox.left);
      const target = chipStart - (scroller.clientWidth - chipBox.width) / 2;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const left = Math.max(0, target);

      cancelScroll?.();

      if (smooth && !reduced) {
        cancelScroll = animateScrollLeft(scroller, left);
        return;
      }

      scroller.scrollLeft = left;
    };

    const smooth = hasCentredOnce.current;
    const frame = requestAnimationFrame(() => centreSelected(smooth));

    void document.fonts?.ready.then(() => centreSelected(false));

    const observer = new ResizeObserver(() => centreSelected(false));
    observer.observe(scroller);

    hasCentredOnce.current = true;

    return () => {
      cancelled = true;
      cancelScroll?.();
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [selectedDate]);

  return (
    <div
      ref={scrollerRef}
      role="group"
      aria-label="Select a day"
      className="flex snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto px-6 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
    >
      {days.map((day) => {
        const selected = toLocalDateKey(day) === toLocalDateKey(selectedDate);

        return (
          <div
            key={day.toISOString()}
            ref={selected ? selectedRef : undefined}
            className="snap-center"
          >
            <DayChip
              date={day}
              selected={selected}
              isToday={toLocalDateKey(day) === toLocalDateKey(today)}
              onSelect={onSelect}
            />
          </div>
        );
      })}
    </div>
  );
}
