import { redirect } from 'next/navigation';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { HomeScreen } from '@/components/home/HomeScreen';
import { toLocalDateKey } from '@/lib/local-date';
import { getCurrentUser } from '@/server/modules/auth/current-user';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/onboarding');
  }

  return (
    <MobileFrame>
      <HomeScreen initialDate={toLocalDateKey(new Date())} isGuest={user.isGuest} />
    </MobileFrame>
  );
}
