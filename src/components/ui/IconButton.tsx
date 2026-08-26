import type { ButtonHTMLAttributes, Ref } from 'react';

type Tone = 'neutral' | 'destructive';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  label: string;
  tone?: Tone;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
}

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'text-ink-muted hover:text-ink active:text-ink',
  destructive: 'text-pending-glyph hover:bg-pending-surface active:bg-pending-surface',
};

export function IconButton({
  label,
  tone = 'neutral',
  type = 'button',
  children,
  className = '',
  ref,
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={[
        'relative inline-flex size-11 shrink-0 items-center justify-center rounded-md',
        'transition-colors duration-150 outline-none',
        'focus-visible:ring-primary focus-visible:ring-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        TONE_CLASSES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
