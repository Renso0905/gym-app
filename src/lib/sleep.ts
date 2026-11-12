// R15: the sleep tracker. One number per night: the hours slept, filed under
// the day the lifter woke up. Days are local calendar dates written
// YYYY-MM-DD, so an entry never moves when the time zone or the clock changes.

/** Hours slept by day key (YYYY-MM-DD). A day with no key was not tracked. */
export type SleepLog = Readonly<Record<string, number>>;

const pad = (n: number) => String(n).padStart(2, '0');

/** The key for a calendar day. `month` is 0 for January, as in Date. */
export function dayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** The key for the local day containing `time`. */
export function dateKey(time: number): string {
  const date = new Date(time);
  return dayKey(date.getFullYear(), date.getMonth(), date.getDate());
}

/** The parts of a key, or null unless it names a real calendar day. */
export function parseDayKey(key: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = new Date(year, month, day);
  // Date rolls 31 February over into March; a real day comes back unchanged.
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? { year, month, day } : null;
}

/** Usable hours: 0 to 24, rounded to the nearest quarter hour. Anything else is "not set". */
export function cleanHours(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 24) return undefined;
  return Math.round(value * 4) / 4;
}

/**
 * Records the hours for a day, or removes the entry when `hours` is undefined
 * or unusable. An invalid day changes nothing.
 */
export function setSleep(log: SleepLog, key: string, hours: number | undefined): SleepLog {
  if (!parseDayKey(key)) return log;
  const clean = cleanHours(hours);
  if (clean === undefined) {
    if (!(key in log)) return log;
    const { [key]: _removed, ...rest } = log;
    return rest;
  }
  return log[key] === clean ? log : { ...log, [key]: clean };
}

/** Half an hour more (1) or less (-1), kept within 0 to 24. An empty day starts at 8. */
export function stepHours(hours: number | undefined, direction: -1 | 1): number {
  if (hours === undefined) return 8;
  return Math.min(24, Math.max(0, hours + direction * 0.5));
}

export type SleepBand = 'short' | 'fair' | 'good' | 'long';

/** The legend, shortest first. Each band starts at `from` hours and runs up to the next one. */
export const SLEEP_BANDS: ReadonlyArray<{ band: SleepBand; from: number; label: string }> = [
  { band: 'short', from: 0, label: 'Under 6 h' },
  { band: 'fair', from: 6, label: '6 to 7 h' },
  { band: 'good', from: 7, label: '7 to 8 h' },
  { band: 'long', from: 8, label: '8 h or more' },
];

/** Which colour band a night falls in. A boundary belongs to the band above it: exactly 7 hours is "good". */
export function sleepBand(hours: number): SleepBand {
  let band: SleepBand = 'short';
  for (const entry of SLEEP_BANDS) if (hours >= entry.from) band = entry.band;
  return band;
}

export interface CalendarDay {
  key: string;
  /** Day of the month, from 1. */
  day: number;
  when: 'past' | 'today' | 'future';
  /** Absent when the day was not tracked. */
  hours?: number;
}

/**
 * A month as rows of seven, Monday first. Cells before the 1st and after the
 * last day are null. `month` is 0 for January.
 */
export function monthCalendar(log: SleepLog, year: number, month: number, now: number): Array<Array<CalendarDay | null>> {
  const today = dateKey(now);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: Array<CalendarDay | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day++) {
    const key = dayKey(year, month, day);
    const cell: CalendarDay = { key, day, when: key === today ? 'today' : key < today ? 'past' : 'future' };
    if (key in log) cell.hours = log[key];
    cells.push(cell);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<CalendarDay | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export interface MonthSummary {
  /** Nights with an entry. */
  tracked: number;
  /** Mean hours over the tracked nights; absent when there are none. */
  average?: number;
}

export function monthSummary(log: SleepLog, year: number, month: number): MonthSummary {
  const prefix = dayKey(year, month, 1).slice(0, 8);
  const hours = Object.entries(log)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => value);
  if (hours.length === 0) return { tracked: 0 };
  return { tracked: hours.length, average: hours.reduce((a, b) => a + b, 0) / hours.length };
}

/** The month before (-1) or after (1). */
export function shiftMonth(year: number, month: number, direction: -1 | 1): { year: number; month: number } {
  const date = new Date(year, month + direction, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Hours as "7 h" or "7.5 h", to at most two decimal places. */
export function formatHours(hours: number): string {
  return `${Math.round(hours * 100) / 100} h`;
}

/** Local calendar keys ending with the day containing `now`, oldest first. */
export function recentDayKeys(now: number, days: number): string[] {
  const end = new Date(now);
  const count = Math.max(0, Math.floor(days));
  return Array.from({ length: count }, (_, index) => {
    const offset = count - index - 1;
    const date = new Date(end.getFullYear(), end.getMonth(), end.getDate() - offset, 12);
    return dayKey(date.getFullYear(), date.getMonth(), date.getDate());
  });
}

export interface SleepProgressPoint {
  key: string;
  hours: number;
}

/** Tracked nights in the requested recent window, in calendar order. */
export function sleepProgress(log: SleepLog, now: number, days = 30): SleepProgressPoint[] {
  return recentDayKeys(now, days)
    .filter((key) => key in log)
    .map((key) => ({ key, hours: log[key] }));
}

export interface SleepStatistics {
  tracked: number;
  average?: number;
  longest?: number;
  shortest?: number;
  sevenPlus: number;
  sevenPlusPercent?: number;
}

/** Summary of tracked nights in the requested recent window. */
export function sleepStatistics(log: SleepLog, now: number, days = 30): SleepStatistics {
  const hours = sleepProgress(log, now, days).map((point) => point.hours);
  if (hours.length === 0) return { tracked: 0, sevenPlus: 0 };
  const sevenPlus = hours.filter((value) => value >= 7).length;
  return {
    tracked: hours.length,
    average: hours.reduce((sum, value) => sum + value, 0) / hours.length,
    longest: Math.max(...hours),
    shortest: Math.min(...hours),
    sevenPlus,
    sevenPlusPercent: (sevenPlus / hours.length) * 100,
  };
}
