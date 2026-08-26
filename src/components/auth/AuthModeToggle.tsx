export type AuthMode = 'signin' | 'signup';

interface AuthModeToggleProps {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
  disabled?: boolean;
}

const OPTIONS: { value: AuthMode; label: string }[] = [
  { value: 'signin', label: 'Sign in' },
  { value: 'signup', label: 'Sign up' },
];

export function AuthModeToggle({ mode, onChange, disabled = false }: AuthModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Authentication mode"
      className="bg-complete-surface flex gap-2 rounded-md p-1"
    >
      {OPTIONS.map((option) => {
        const active = option.value === mode;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={[
              'text-task h-10 flex-1 rounded-sm font-medium transition-colors duration-150',
              'focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none',
              active ? 'bg-primary text-surface shadow-sm' : 'text-primary hover:bg-primary/10',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
