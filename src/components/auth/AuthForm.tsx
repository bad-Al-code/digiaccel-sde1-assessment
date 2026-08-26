'use client';

import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { AuthModeToggle, type AuthMode } from './AuthModeToggle';
import { PasswordField } from './PasswordField';
import { useAuthForm } from './useAuthForm';

export function AuthForm({ initialMode = 'signin' }: { initialMode?: AuthMode }) {
  const { mode, form, fieldErrors, formError, submitting, setField, switchMode, submit } =
    useAuthForm(initialMode);

  const isSignup = mode === 'signup';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <AuthModeToggle mode={mode} onChange={switchMode} disabled={submitting} />

      {isSignup ? (
        <TextField
          label="Name"
          value={form.name}
          onChange={(event) => setField('name')(event.target.value)}
          autoComplete="name"
          placeholder="Your name"
          disabled={submitting}
          {...(fieldErrors.name ? { error: fieldErrors.name } : {})}
        />
      ) : null}

      <TextField
        label="Email"
        type="email"
        inputMode="email"
        value={form.email}
        onChange={(event) => setField('email')(event.target.value)}
        autoComplete="email"
        placeholder="you@example.com"
        disabled={submitting}
        {...(fieldErrors.email ? { error: fieldErrors.email } : {})}
      />

      <PasswordField
        value={form.password}
        onChange={setField('password')}
        autoComplete={isSignup ? 'new-password' : 'current-password'}
        disabled={submitting}
        {...(fieldErrors.password ? { error: fieldErrors.password } : {})}
      />

      {formError ? (
        <p role="alert" className="text-card-label text-pending-glyph">
          {formError}
        </p>
      ) : null}

      <Button type="submit" loading={submitting}>
        {isSignup ? 'Create account' : 'Sign in'}
      </Button>
    </form>
  );
}
