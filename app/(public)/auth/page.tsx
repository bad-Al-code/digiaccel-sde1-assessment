import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthHeader } from '@/components/auth/AuthHeader';
import { MobileFrame } from '@/components/layout/MobileFrame';

export const metadata: Metadata = {
  title: 'Sign in',
};

interface AuthPageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const { mode } = await searchParams;
  const initialMode = mode === 'signup' ? 'signup' : 'signin';

  return (
    <MobileFrame>
      <AuthHeader
        title={initialMode === 'signup' ? 'Create Account' : 'Welcome Back'}
        subtitle={
          initialMode === 'signup'
            ? 'Sign up to add more tasks and keep the one you made'
            : 'Sign in to pick up where you left off'
        }
      />
      <main className="flex-1 px-6 pt-7 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <AuthForm initialMode={initialMode} />
      </main>
    </MobileFrame>
  );
}
