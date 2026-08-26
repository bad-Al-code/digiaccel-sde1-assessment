import { useId, type InputHTMLAttributes, type Ref } from 'react';
import { FIELD_BASE_CLASSES, FieldShell } from './FieldShell';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

export function TextField({
  label,
  error,
  id,
  wrapperClassName,
  className = '',
  ref,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <FieldShell
      label={label}
      htmlFor={inputId}
      error={error}
      errorId={errorId}
      className={wrapperClassName ?? ''}
    >
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={[FIELD_BASE_CLASSES, 'h-12', className].filter(Boolean).join(' ')}
        {...props}
      />
    </FieldShell>
  );
}
