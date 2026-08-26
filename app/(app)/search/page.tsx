import type { Metadata } from 'next';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { SearchScreen } from '@/components/search/SearchScreen';

export const metadata: Metadata = { title: 'Search tasks' };
export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <MobileFrame>
      <SearchScreen />
    </MobileFrame>
  );
}
