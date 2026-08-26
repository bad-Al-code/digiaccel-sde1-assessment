'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useStartGuestSession } from '@/client/guest/use-guest-session';

export function OnboardingActions() {
  const startGuest = useStartGuestSession();

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => startGuest.mutate()} loading={startGuest.isPending}>
        Get Started
      </Button>
      <Link
        href="/auth"
        className="text-task text-ink-soft hover:text-ink text-center font-medium transition-colors duration-150"
      >
        I already have an account
      </Link>
    </div>
  );
}
