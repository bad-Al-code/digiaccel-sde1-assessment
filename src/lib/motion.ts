export const DURATION = {
  micro: 0.15,
  standard: 0.22,
  exit: 0.2,
  accordion: 0.25,
} as const;

export const EASE = {
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
} as const;

export const SHEET_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 38,
  mass: 0.9,
} as const;

export const SCRIM_FADE = {
  duration: DURATION.standard,
  ease: EASE.enter,
} as const;

export const SWIPE_COMMIT_RATIO = 0.4;
export const SWIPE_COMMIT_VELOCITY = 500;
