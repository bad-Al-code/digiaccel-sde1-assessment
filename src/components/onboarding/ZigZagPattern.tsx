interface ZigZagPatternProps {
  className?: string;
  rows?: number;
  columns?: number;
}

export function ZigZagPattern({ className = '', rows = 4, columns = 5 }: ZigZagPatternProps) {
  const step = 24;
  const height = 18;

  return (
    <svg
      className={className}
      width={columns * step}
      height={rows * height + height}
      viewBox={`0 0 ${columns * step} ${rows * height + height}`}
      fill="none"
      aria-hidden="true"
    >
      {Array.from({ length: rows }, (_, row) => (
        <path
          key={row}
          d={buildZigZag(columns, step, row * height, height)}
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="square"
        />
      ))}
    </svg>
  );
}

function buildZigZag(columns: number, step: number, offsetY: number, height: number): string {
  const points = Array.from({ length: columns + 1 }, (_, index) => {
    const x = index * step;
    const y = offsetY + (index % 2 === 0 ? height : 0);
    return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
  });

  return points.join(' ');
}
