'use client';

import { useState } from 'react';
import { TextField } from '@/components/ui/TextField';

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string | undefined;
  disabled?: boolean;
}

export function PasswordField({
  value,
  onChange,
  autoComplete,
  error,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <TextField
        label="Password"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder="At least 8 characters"
        disabled={disabled ?? false}
        className="pr-16"
        {...(error ? { error } : {})}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="text-field-label text-primary hover:bg-complete-surface focus-visible:ring-primary absolute top-[34px] right-3 h-8 rounded-sm px-2 font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
