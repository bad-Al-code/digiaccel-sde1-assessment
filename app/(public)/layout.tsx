import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/server/modules/auth/current-user';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (user && !user.isGuest) {
    redirect('/');
  }

  return <>{children}</>;
}
