import type { Metadata } from 'next';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { WeeksScreen } from '@/components/week/WeeksScreen';

export const metadata: Metadata = { title: 'All weeks' };
export const dynamic = 'force-dynamic';

export default function WeeksPage() {
  return (
    <MobileFrame>
      <WeeksScreen />
    </MobileFrame>
  );
}
