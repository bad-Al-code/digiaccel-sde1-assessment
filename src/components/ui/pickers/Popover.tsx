'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  widthClassName?: string;
}

export function Popover({
  open,
  onClose,
  children,
  align = 'left',
  widthClassName = 'w-full',
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const frame = requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={panelRef}
          role="dialog"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 460, damping: 32, mass: 0.6 }}
          style={{ transformOrigin: align === 'right' ? 'top right' : 'top left' }}
          className={[
            'border-line bg-surface absolute top-[calc(100%+8px)] z-40 rounded-lg border p-4',
            'shadow-[0_12px_32px_rgba(15,19,34,0.14)] motion-reduce:transition-none',
            align === 'right' ? 'right-0' : 'left-0',
            widthClassName,
          ].join(' ')}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
