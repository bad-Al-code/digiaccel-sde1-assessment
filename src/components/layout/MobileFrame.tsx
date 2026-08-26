import type { ReactNode } from 'react';

interface MobileFrameProps {
  children: ReactNode;
  className?: string;
}

export function MobileFrame({ children, className = '' }: MobileFrameProps) {
  return (
    <div className="bg-background flex min-h-dvh w-full justify-center">
      <div
        className={['max-w-app bg-background flex w-full flex-col', className]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  );
}
