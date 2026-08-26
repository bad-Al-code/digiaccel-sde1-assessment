'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiClient } from '@/client/api/api-client';
import { ApiError } from '@/client/api/api-error';
import type { AuthMode } from './AuthModeToggle';

interface FormState {
  name: string;
  email: string;
  password: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', password: '' };

export function useAuthForm(initialMode: AuthMode = 'signin') {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
    setFormError(null);
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setFieldErrors({});
    setFormError(null);
  };

  const submit = async () => {
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const path = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'signup'
          ? { name: form.name.trim(), email: form.email.trim(), password: form.password }
          : { email: form.email.trim(), password: form.password };

      await apiClient.post(path, payload);
      router.replace('/');
      router.refresh();
    } catch (error) {
      applyError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const applyError = (error: unknown) => {
    if (!(error instanceof ApiError)) {
      setFormError('Something went wrong. Please try again.');
      return;
    }

    if (error.code === 'EMAIL_ALREADY_REGISTERED') {
      setFieldErrors({ email: error.message });
      return;
    }

    if (error.fieldErrors.length > 0) {
      setFieldErrors(
        Object.fromEntries(error.fieldErrors.map((entry) => [entry.field, entry.message])),
      );
      return;
    }

    setFormError(error.message);
  };

  return {
    mode,
    form,
    fieldErrors,
    formError,
    submitting,
    setField,
    switchMode,
    submit,
  };
}
