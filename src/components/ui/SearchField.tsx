import { useId, type InputHTMLAttributes, type Ref } from 'react';
import { SearchIcon } from './icons';

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  wrapperClassName?: string;
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

export function SearchField({
  label = 'Search for a task',
  placeholder = 'Search for a task',
  id,
  wrapperClassName = '',
  className = '',
  ref,
  ...props
}: SearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={['relative w-full', wrapperClassName].filter(Boolean).join(' ')}>
      <input
        ref={ref}
        id={inputId}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        className={[
          'border-line bg-surface text-task text-ink h-12 w-full rounded-md border pr-12 pl-4',
          'placeholder:text-ink-muted transition-colors duration-150 outline-none',
          'focus:border-primary focus:ring-primary/25 focus:ring-2',
          '[&::-webkit-search-cancel-button]:appearance-none',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      <SearchIcon className="text-ink pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" />
    </div>
  );
}
