import { useId, type Ref, type TextareaHTMLAttributes } from 'react';
import { FIELD_BASE_CLASSES, FieldShell } from './FieldShell';

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  ref?: Ref<HTMLTextAreaElement>;
  className?: string;
}

export function TextArea({
  label,
  error,
  id,
  rows = 4,
  wrapperClassName,
  className = '',
  ref,
  ...props
}: TextAreaProps) {
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
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={[FIELD_BASE_CLASSES, 'resize-none py-3 leading-6', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    </FieldShell>
  );
}
