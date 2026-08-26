'use client';

import { motion, useMotionValue, type PanInfo } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { SWIPE_COMMIT_RATIO, SWIPE_COMMIT_VELOCITY } from '@/lib/motion';
import { TrashIcon } from '@/components/ui/icons';

interface SwipeToDeleteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  children: ReactNode;
}

const REVEAL_WIDTH = 96;

export function SwipeToDelete({ open, onOpenChange, onDelete, children }: SwipeToDeleteProps) {
  const x = useMotionValue(0);

  useEffect(() => {
    void x.set(open ? -REVEAL_WIDTH : 0);
  }, [open, x]);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const threshold = REVEAL_WIDTH * SWIPE_COMMIT_RATIO;
    const shouldOpen = info.offset.x < -threshold || info.velocity.x < -SWIPE_COMMIT_VELOCITY;

    onOpenChange(shouldOpen);
  };

  return (
    <div className="relative overflow-hidden">
      <button
        type="button"
        onClick={onDelete}
        tabIndex={open ? 0 : -1}
        aria-hidden={!open}
        className="bg-pending-glyph text-surface absolute inset-y-0 right-0 flex w-24 items-center justify-center"
      >
        <TrashIcon className="size-5" />
        <span className="sr-only">Delete task</span>
      </button>
      <motion.div
        drag="x"
        style={{ x }}
        dragDirectionLock
        dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        animate={{ x: open ? -REVEAL_WIDTH : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 42 }}
        className="bg-background relative touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
