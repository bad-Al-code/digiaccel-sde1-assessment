'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/client/api/api-client';
import type { User } from '@/types';
import { getFingerprint } from './fingerprint';

export function useStartGuestSession() {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      const fingerprint = await getFingerprint();

      return apiClient.post<User>('/api/auth/guest', fingerprint ? { fingerprint } : {});
    },
    onSuccess: () => {
      router.replace('/');
      router.refresh();
    },
  });
}
