'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { SCRIM_FADE } from '@/lib/motion';
import { Button } from './Button';

const subscribeToNothing = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export type ConfirmTone = 'primary' | 'destructive';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const mounted = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open || !mounted) return;

    const frame = requestAnimationFrame(() => confirmRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, mounted, onCancel]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SCRIM_FADE}
            onClick={onCancel}
            aria-hidden="true"
            className="bg-scrim absolute inset-0"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 460, damping: 32, mass: 0.7 }}
            className="bg-surface relative flex w-full max-w-[20rem] flex-col gap-2 rounded-xl p-6 shadow-[0_16px_40px_rgba(15,19,34,0.18)] motion-reduce:transition-none"
          >
            <h2
              id={titleId}
              className={[
                'text-sheet-title font-semibold',
                tone === 'destructive' ? 'text-priority-high' : 'text-ink',
              ].join(' ')}
            >
              {title}
            </h2>
            <p className="text-body text-ink-soft">{description}</p>
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
                {cancelLabel}
              </Button>
              <Button
                ref={confirmRef}
                size="sm"
                loading={busy}
                onClick={onConfirm}
                className={
                  tone === 'destructive'
                    ? 'bg-priority-high hover:bg-priority-high/90 active:bg-priority-high/90 focus-visible:ring-priority-high'
                    : ''
                }
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
