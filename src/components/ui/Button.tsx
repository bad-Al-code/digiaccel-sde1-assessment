import type { ButtonHTMLAttributes, Ref } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  ref?: Ref<HTMLButtonElement>;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-primary text-surface hover:bg-primary-strong active:bg-primary-strong',
  secondary: 'bg-transparent text-primary hover:bg-complete-surface active:bg-complete-surface',
  ghost: 'bg-transparent text-ink-soft hover:bg-line-soft active:bg-line-soft',
};

const SIZE_CLASSES: Record<Size, string> = {
  md: 'h-13 px-5 text-button',
  sm: 'h-11 px-4 text-task',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = true,
  disabled = false,
  type = 'button',
  children,
  className = '',
  ref,
  ...props
}: ButtonProps) {
  const isBlocked = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isBlocked}
      aria-busy={loading}
      className={[
        'relative inline-flex items-center justify-center gap-2 rounded-sm font-medium',
        'transition-colors duration-150 outline-none',
        'focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-55',
        fullWidth ? 'w-full' : '',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <span className={loading ? 'invisible' : 'truncate'}>{children}</span>
      {loading ? <Spinner /> : null}
    </button>
  );
}

function Spinner() {
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
    </span>
  );
}
