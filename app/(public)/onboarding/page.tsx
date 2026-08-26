import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/modules/auth/current-user';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { OnboardingActions } from '@/components/onboarding/page-actions';
import { OnboardingHero } from '@/components/onboarding/OnboardingHero';

export const metadata: Metadata = {
  title: 'Manage What To Do',
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/');
  }

  return (
    <MobileFrame>
      <OnboardingHero />
      <section className="flex flex-col gap-3 px-6 pt-4">
        <h1 className="text-display text-ink font-bold">Manage What To Do</h1>
        <p className="text-body text-ink-soft max-w-[19rem]">
          The best way to manage what you have to do, don&apos;t forget your plans
        </p>
      </section>
      <div className="mt-auto px-6 pt-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <OnboardingActions />
      </div>
    </MobileFrame>
  );
}
