'use client';

import { useId, type InputHTMLAttributes, type Ref } from 'react';
import { CheckIcon } from './icons';

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className' | 'size'
> {
  label: string;
  ref?: Ref<HTMLInputElement>;
  className?: string;
}

export function Checkbox({ label, id, checked, className = '', ref, ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <span
      className={['relative inline-flex size-11 items-center justify-center', className].join(' ')}
    >
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        checked={checked}
        className="peer absolute inset-0 cursor-pointer opacity-0"
        aria-label={label}
        {...props}
      />
      <span
        aria-hidden="true"
        className="border-primary bg-surface peer-focus-visible:ring-primary pointer-events-none flex size-[22px] items-center justify-center rounded-sm border-[1.5px] transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2"
      >
        <CheckIcon
          strokeWidth={2.5}
          className={[
            'text-primary size-3.5 transition-all duration-150 motion-reduce:transition-none',
            checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          ].join(' ')}
        />
      </span>
    </span>
  );
}
