export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={['bg-line-soft animate-pulse rounded-md', className].filter(Boolean).join(' ')}
    />
  );
}

export function TaskListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1 px-6">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="border-line flex items-center gap-3 border-b py-4">
          <Skeleton className="size-[22px] rounded-sm" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}
