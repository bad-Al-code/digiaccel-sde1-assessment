import type { ReactNode } from 'react';
import { RouteTransition } from '@/components/layout/RouteTransition';

export default function PublicTemplate({ children }: { children: ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
