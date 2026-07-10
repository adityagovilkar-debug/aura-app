// Date helpers. Days are addressed by local-timezone keys "YYYY-MM-DD".

export function keyOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return keyOf(new Date());
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return keyOf(d);
}

/** The 7 day-keys of the Monday-start week containing `key`. */
export function weekOf(key: string): string[] {
  const d = parseKey(key);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  const monday = addDays(key, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** The last `n` day-keys ending at `key` (inclusive), oldest first. */
export function lastNDays(key: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(key, i - (n - 1)));
}

export function formatLong(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function formatShort(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function weekdayShort(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, { weekday: 'short' });
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
