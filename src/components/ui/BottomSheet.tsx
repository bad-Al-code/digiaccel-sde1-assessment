'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SCRIM_FADE, SHEET_SPRING } from '@/lib/motion';
import { CloseIcon } from './icons';
import { IconButton } from './IconButton';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  initialFocusRef?: { current: HTMLElement | null };
}

const subscribeToNothing = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function BottomSheet({ open, title, onClose, children, initialFocusRef }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const mounted = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const scrollY = window.scrollY;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      window.scrollTo(0, scrollY);
      triggerRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !mounted) return;

    const frame = requestAnimationFrame(() => {
      const firstField = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      const target = initialFocusRef?.current ?? firstField ?? panelRef.current;
      target?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [open, mounted, initialFocusRef]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onKeyDown={handleKeyDown}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SCRIM_FADE}
            onClick={onClose}
            className="bg-scrim absolute inset-0"
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_SPRING}
            className="max-w-app bg-surface shadow-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-xl pb-[env(safe-area-inset-bottom)] motion-reduce:transition-none"
          >
            <header className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 id={titleId} className="text-sheet-title text-ink font-semibold">
                {title}
              </h2>
              <IconButton label="Close" onClick={onClose} className="-mr-2">
                <CloseIcon className="size-6" />
              </IconButton>
            </header>
            <div
              ref={contentRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-2 pb-6"
            >
              {children}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
