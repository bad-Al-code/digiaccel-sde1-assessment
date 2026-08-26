export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function fromLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);

  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function combineLocalDateTime(dateKey: string, time: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  return new Date(
    year ?? 1970,
    (month ?? 1) - 1,
    day ?? 1,
    hours ?? 0,
    minutes ?? 0,
    0,
    0,
  ).toISOString();
}

export function splitLocalDateTime(iso: string): { date: string; time: string } {
  const value = new Date(iso);

  return {
    date: toLocalDateKey(value),
    time: `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`,
  };
}

export function localDayRange(dateKey: string): { from: string; to: string } {
  const start = fromLocalDateKey(dateKey);
  const end = new Date(start.getTime() + 86_400_000 - 1);

  return { from: start.toISOString(), to: end.toISOString() };
}

export function localWeekRange(dateKey: string): { from: string; to: string } {
  const day = fromLocalDateKey(dateKey);
  const daysSinceMonday = (day.getDay() + 6) % 7;
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate() - daysSinceMonday);
  const end = new Date(start.getTime() + 7 * 86_400_000 - 1);

  return { from: start.toISOString(), to: end.toISOString() };
}

export function addLocalDays(dateKey: string, days: number): string {
  const day = fromLocalDateKey(dateKey);

  return toLocalDateKey(new Date(day.getFullYear(), day.getMonth(), day.getDate() + days));
}

export function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
