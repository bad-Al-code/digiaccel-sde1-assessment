export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const JWT_ALGORITHM = 'HS256' as const;
export const JWT_ISSUER = 'todo-app';
export const JWT_AUDIENCE = 'todo-app-client';

export const CLOCK_TOLERANCE_SECONDS = 5;

export const BCRYPT_COST = 12;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

const DURATION_UNITS: Record<string, number> = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

export function durationToSeconds(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration);

  if (!match) {
    throw new Error(`Unsupported duration: ${duration}`);
  }

  const amount = Number(match[1]);
  const unit = DURATION_UNITS[match[2] as string];

  if (unit === undefined) {
    throw new Error(`Unsupported duration unit: ${duration}`);
  }

  return Math.floor(amount * unit);
}
