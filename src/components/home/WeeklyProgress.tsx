interface WeeklyProgressProps {
  percentage: number;
}

export function WeeklyProgress({ percentage }: WeeklyProgressProps) {
  const safePercentage = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;

  return (
    <section className="flex flex-col gap-4 px-6">
      <h2 className="text-section text-ink font-semibold">Weekly Progress</h2>
      <div
        role="progressbar"
        aria-valuenow={safePercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Weekly progress"
        className="bg-primary-track h-3.5 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-primary-strong h-full rounded-full transition-[width] duration-[250ms] ease-out motion-reduce:transition-none"
          style={{ width: `${safePercentage}%` }}
        />
      </div>
    </section>
  );
}
