import { ZigZagPattern } from '@/components/onboarding/ZigZagPattern';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <header className="bg-primary relative h-[38%] shrink-0 overflow-hidden px-6 pb-8">
      <div
        aria-hidden="true"
        className="border-primary-soft absolute -top-20 -right-20 size-40 rounded-full border-[18px]"
      />
      <ZigZagPattern className="text-primary-soft absolute top-9 -left-4" rows={3} columns={4} />
      <div className="relative flex h-full flex-col justify-end gap-2">
        <h1 className="text-display text-surface font-bold">{title}</h1>
        <p className="text-body text-surface/80 max-w-[18rem]">{subtitle}</p>
      </div>
    </header>
  );
}
