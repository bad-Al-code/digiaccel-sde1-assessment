import { ZigZagPattern } from './ZigZagPattern';

export function OnboardingHero() {
  return (
    <div className="bg-primary relative h-[66.7%] shrink-0 overflow-hidden">
      <div
        aria-hidden="true"
        className="border-primary-soft absolute -top-20 -right-20 size-40 rounded-full border-[18px]"
      />
      <ZigZagPattern
        className="text-primary-soft absolute top-[100px] -left-2"
        rows={4}
        columns={5}
      />
      <ZigZagPattern
        className="text-primary-soft absolute top-[440px] right-0"
        rows={4}
        columns={5}
      />
    </div>
  );
}
