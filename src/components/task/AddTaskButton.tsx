import { PlusIcon } from '@/components/ui/icons';

export function AddTaskButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add task"
      className="bg-primary text-surface shadow-fab focus-visible:ring-primary flex size-20 items-center justify-center rounded-full transition-transform duration-150 hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 motion-reduce:transition-none"
    >
      <PlusIcon className="size-8" strokeWidth={2} />
    </button>
  );
}
