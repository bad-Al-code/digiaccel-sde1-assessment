const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysSinceMonday(date: Date): number {
  return (date.getUTCDay() + 6) % DAYS_PER_WEEK;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getWeekStart(date: Date): Date {
  const dayStart = startOfUtcDay(date);
  dayStart.setUTCDate(dayStart.getUTCDate() - daysSinceMonday(dayStart));

  return dayStart;
}

export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);

  return new Date(weekStart.getTime() + DAYS_PER_WEEK * MS_PER_DAY - 1);
}

export interface WeekRange {
  readonly weekStart: Date;
  readonly weekEnd: Date;
}

export function getWeekRange(date: Date): WeekRange {
  return { weekStart: getWeekStart(date), weekEnd: getWeekEnd(date) };
}

export function addWeeks(date: Date, count: number): Date {
  return new Date(date.getTime() + count * DAYS_PER_WEEK * MS_PER_DAY);
}

export function isSameWeek(left: Date, right: Date): boolean {
  return getWeekStart(left).getTime() === getWeekStart(right).getTime();
}
