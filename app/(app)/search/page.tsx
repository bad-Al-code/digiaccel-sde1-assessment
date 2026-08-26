import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { SearchScreen } from '@/components/search/SearchScreen';
import { getCurrentUser } from '@/server/modules/auth/current-user';

export const metadata: Metadata = { title: 'Search tasks' };
export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/onboarding');
  }

  return (
    <MobileFrame>
      <SearchScreen isGuest={user.isGuest} />
    </MobileFrame>
  );
}
