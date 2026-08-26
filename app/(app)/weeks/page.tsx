import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { WeeksScreen } from '@/components/week/WeeksScreen';
import { getCurrentUser } from '@/server/modules/auth/current-user';

export const metadata: Metadata = { title: 'All weeks' };
export const dynamic = 'force-dynamic';

export default async function WeeksPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/onboarding');
  }

  return (
    <MobileFrame>
      <WeeksScreen isGuest={user.isGuest} />
    </MobileFrame>
  );
}
