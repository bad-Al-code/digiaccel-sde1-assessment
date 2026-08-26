const DEFAULT_DURATION_MS = 480;

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function animateScrollLeft(
  element: HTMLElement,
  targetLeft: number,
  durationMs = DEFAULT_DURATION_MS,
): () => void {
  const start = element.scrollLeft;
  const distance = targetLeft - start;

  if (Math.abs(distance) < 1 || durationMs <= 0) {
    element.scrollLeft = targetLeft;
    return () => undefined;
  }

  let frame = 0;
  let startedAt: number | null = null;

  const step = (timestamp: number) => {
    startedAt ??= timestamp;

    const elapsed = timestamp - startedAt;
    const progress = Math.min(1, elapsed / durationMs);

    element.scrollLeft = start + distance * easeInOutCubic(progress);

    if (progress < 1) {
      frame = requestAnimationFrame(step);
    }
  };

  frame = requestAnimationFrame(step);

  return () => cancelAnimationFrame(frame);
}
