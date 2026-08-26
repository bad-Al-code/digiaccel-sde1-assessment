'use client';

import { useId, type InputHTMLAttributes, type Ref } from 'react';
import { CloseIcon, SearchIcon } from './icons';
import { Spinner } from './Spinner';

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  loading?: boolean;
  onClear?: () => void;
  wrapperClassName?: string;
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

export function SearchField({
  label = 'Search for a task',
  placeholder = 'Search for a task',
  loading = false,
  onClear,
  value,
  id,
  wrapperClassName = '',
  className = '',
  ref,
  ...props
}: SearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasText = typeof value === 'string' && value.length > 0;

  return (
    <div className={['relative w-full', wrapperClassName].filter(Boolean).join(' ')}>
      <input
        ref={ref}
        id={inputId}
        type="text"
        value={value}
        aria-label={label}
        placeholder={placeholder}
        autoComplete="off"
        className={[
          'border-line bg-surface text-task text-ink h-12 w-full rounded-md border pr-12 pl-4',
          'placeholder:text-ink-muted transition-colors duration-150 outline-none',
          'focus:border-primary focus:ring-primary/25 focus:ring-2',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      <SearchAdornment
        loading={loading}
        showClear={hasText && Boolean(onClear)}
        onClear={onClear}
      />
    </div>
  );
}

interface SearchAdornmentProps {
  loading: boolean;
  showClear: boolean;
  onClear?: (() => void) | undefined;
}

function SearchAdornment({ loading, showClear, onClear }: SearchAdornmentProps) {
  if (loading) {
    return (
      <span className="text-primary absolute top-1/2 right-4 -translate-y-1/2">
        <Spinner className="size-5" />
      </span>
    );
  }

  if (showClear && onClear) {
    return (
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear search"
        className="text-ink-muted hover:bg-line-soft hover:text-ink focus-visible:ring-primary absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
      >
        <CloseIcon className="size-4" strokeWidth={2} />
      </button>
    );
  }

  return (
    <SearchIcon className="text-ink pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" />
  );
}
