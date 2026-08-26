import type { ReactNode } from 'react';

interface FieldShellProps {
  label?: string | undefined;
  htmlFor: string;
  error?: string | undefined;
  errorId: string;
  children: ReactNode;
  className?: string;
}

export function FieldShell({
  label,
  htmlFor,
  error,
  errorId,
  children,
  className = '',
}: FieldShellProps) {
  return (
    <div className={['flex flex-col gap-2', className].filter(Boolean).join(' ')}>
      {label ? (
        <label htmlFor={htmlFor} className="text-field-label text-ink-muted">
          {label}
        </label>
      ) : null}
      {children}
      <p
        id={errorId}
        role={error ? 'alert' : undefined}
        className={[
          'text-card-label text-pending-glyph transition-opacity duration-150',
          error ? 'opacity-100' : 'h-0 overflow-hidden opacity-0',
        ].join(' ')}
      >
        {error ?? ''}
      </p>
    </div>
  );
}

export const FIELD_BASE_CLASSES =
  'w-full rounded-sm border border-line-soft bg-surface px-4 text-task text-ink placeholder:text-ink-muted outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-pending-glyph';
