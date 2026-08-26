import { CompleteTileIcon, PendingTileIcon } from '@/components/ui/icons';
import { SummaryCard } from './SummaryCard';

interface SummaryCardsProps {
  completedCount: number;
  openCount: number;
}

export function SummaryCards({ completedCount, openCount }: SummaryCardsProps) {
  return (
    <div className="flex gap-3 px-6">
      <SummaryCard
        tone="complete"
        icon={<CompleteTileIcon className="size-7" />}
        label="Task Complete"
        count={completedCount}
      />
      <SummaryCard
        tone="pending"
        icon={<PendingTileIcon className="size-7" />}
        label="Task Pending"
        count={openCount}
      />
    </div>
  );
}
