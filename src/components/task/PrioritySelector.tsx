import { TASK_PRIORITY_VALUES, type TaskPriority } from '@/types';

interface PrioritySelectorProps {
  value: TaskPriority | null;
  onChange: (value: TaskPriority | null) => void;
}

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-field-label text-ink-muted">Priority</span>
      <div className="flex gap-2">
        <PriorityPill label="None" active={value === null} onClick={() => onChange(null)} />
        {TASK_PRIORITY_VALUES.map((priority) => (
          <PriorityPill
            key={priority}
            label={`${priority.charAt(0)}${priority.slice(1).toLowerCase()}`}
            active={value === priority}
            onClick={() => onChange(priority)}
          />
        ))}
      </div>
    </div>
  );
}

function PriorityPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'text-field-label h-9 flex-1 rounded-full font-medium transition-colors duration-150',
        'focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none',
        active ? 'bg-primary text-surface' : 'bg-complete-surface text-primary hover:bg-primary/10',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
