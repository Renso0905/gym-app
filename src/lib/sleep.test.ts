import { describe, expect, it } from 'vitest';
import {
  cleanHours,
  dateKey,
  dayKey,
  formatHours,
  monthCalendar,
  monthSummary,
  parseDayKey,
  setSleep,
  shiftMonth,
  sleepBand,
  stepHours,
  recentDayKeys,
  sleepProgress,
  sleepStatistics,
} from './sleep';
import { loadSleep, saveSleep, SLEEP_KEY, type KeyValueStore } from './storage';

// Local-time dates, so the tests give the same answer in any time zone.
const NOW = new Date(2026, 10, 11, 9).getTime(); // Wednesday 11 November 2026

describe('day keys', () => {
  it('writes a local day as YYYY-MM-DD', () => {
    expect(dayKey(2026, 0, 5)).toBe('2026-01-05');
    expect(dateKey(NOW)).toBe('2026-11-11');
    expect(dateKey(new Date(2026, 10, 11, 23, 59).getTime())).toBe('2026-11-11');
    expect(dateKey(new Date(2026, 10, 12, 0, 0).getTime())).toBe('2026-11-12');
  });

  it('reads back only real calendar days', () => {
    expect(parseDayKey('2026-11-11')).toEqual({ year: 2026, month: 10, day: 11 });
    expect(parseDayKey('2028-02-29')).not.toBeNull();
    expect(parseDayKey('2026-02-29')).toBeNull();
    expect(parseDayKey('2026-13-01')).toBeNull();
    expect(parseDayKey('2026-1-1')).toBeNull();
    expect(parseDayKey('yesterday')).toBeNull();
  });
});

describe('hours', () => {
  it('accepts 0 to 24 and rounds to the quarter hour', () => {
    expect(cleanHours(0)).toBe(0);
    expect(cleanHours(7.5)).toBe(7.5);
    expect(cleanHours(7.2)).toBe(7.25);
    expect(cleanHours(24)).toBe(24);
  });

  it('rejects anything else', () => {
    expect(cleanHours(-1)).toBeUndefined();
    expect(cleanHours(24.5)).toBeUndefined();
    expect(cleanHours(Number.NaN)).toBeUndefined();
    expect(cleanHours('8')).toBeUndefined();
    expect(cleanHours(undefined)).toBeUndefined();
  });

  it('steps by half an hour within 0 to 24, starting an empty day at 8', () => {
    expect(stepHours(7, 1)).toBe(7.5);
    expect(stepHours(7, -1)).toBe(6.5);
    expect(stepHours(0, -1)).toBe(0);
    expect(stepHours(24, 1)).toBe(24);
    expect(stepHours(undefined, 1)).toBe(8);
    expect(stepHours(undefined, -1)).toBe(8);
  });

  it('formats hours briefly', () => {
    expect(formatHours(7)).toBe('7 h');
    expect(formatHours(7.5)).toBe('7.5 h');
    expect(formatHours(7.3333)).toBe('7.33 h');
  });
});

describe('recording sleep', () => {
  it('adds and replaces an entry without changing the original log', () => {
    const empty = {};
    const one = setSleep(empty, '2026-11-10', 7.5);
    expect(one).toEqual({ '2026-11-10': 7.5 });
    expect(empty).toEqual({});
    expect(setSleep(one, '2026-11-10', 6)).toEqual({ '2026-11-10': 6 });
  });

  it('removes the entry when the hours are cleared or unusable', () => {
    const log = { '2026-11-09': 8, '2026-11-10': 7.5 };
    expect(setSleep(log, '2026-11-10', undefined)).toEqual({ '2026-11-09': 8 });
    expect(setSleep(log, '2026-11-10', 30)).toEqual({ '2026-11-09': 8 });
  });

  it('ignores a day that is not a real date', () => {
    const log = { '2026-11-09': 8 };
    expect(setSleep(log, '2026-02-30', 7)).toBe(log);
    expect(setSleep(log, 'today', 7)).toBe(log);
  });

  it('returns the same log when nothing changes', () => {
    const log = { '2026-11-09': 8 };
    expect(setSleep(log, '2026-11-09', 8)).toBe(log);
    expect(setSleep(log, '2026-11-10', undefined)).toBe(log);
  });
});

describe('colour bands', () => {
  it('is short under 6 hours, including under 4', () => {
    expect(sleepBand(0)).toBe('short');
    expect(sleepBand(3)).toBe('short');
    expect(sleepBand(4)).toBe('short');
    expect(sleepBand(5.75)).toBe('short');
  });

  it('is fair from 6 up to 7', () => {
    expect(sleepBand(6)).toBe('fair');
    expect(sleepBand(6.75)).toBe('fair');
  });

  it('is good from 7 up to 8', () => {
    expect(sleepBand(7)).toBe('good');
    expect(sleepBand(7.75)).toBe('good');
  });

  it('is long at 8 or more', () => {
    expect(sleepBand(8)).toBe('long');
    expect(sleepBand(12)).toBe('long');
  });
});

describe('month calendar', () => {
  const log = { '2026-11-09': 5, '2026-11-10': 7.5, '2026-10-31': 8 };
  const weeks = monthCalendar(log, 2026, 10, NOW);
  const days = weeks.flat().filter((cell) => cell !== null);

  it('lays the month out in weeks that start on Monday', () => {
    // 1 November 2026 is a Sunday, and the month has 30 days.
    expect(weeks).toHaveLength(6);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0].map((cell) => cell?.day ?? null)).toEqual([null, null, null, null, null, null, 1]);
    expect(weeks[1][0]).toMatchObject({ day: 2, key: '2026-11-02' });
    expect(weeks[5].map((cell) => cell?.day ?? null)).toEqual([30, null, null, null, null, null, null]);
    expect(days).toHaveLength(30);
  });

  it('marks each day as past, today or future', () => {
    expect(days.find((d) => d.day === 10)?.when).toBe('past');
    expect(days.find((d) => d.day === 11)?.when).toBe('today');
    expect(days.find((d) => d.day === 12)?.when).toBe('future');
  });

  it('carries the hours of tracked days only', () => {
    expect(days.find((d) => d.day === 9)?.hours).toBe(5);
    expect(days.find((d) => d.day === 10)?.hours).toBe(7.5);
    expect(days.find((d) => d.day === 8)).not.toHaveProperty('hours');
  });

  it('treats every day of an earlier month as past and of a later month as future', () => {
    expect(monthCalendar(log, 2026, 9, NOW).flat().every((cell) => cell === null || cell.when === 'past')).toBe(true);
    expect(monthCalendar(log, 2026, 11, NOW).flat().every((cell) => cell === null || cell.when === 'future')).toBe(true);
  });

  it('adds no empty row to a month that fills four exact weeks', () => {
    // February 2027 starts on a Monday and has 28 days.
    const february = monthCalendar({}, 2027, 1, NOW);
    expect(february).toHaveLength(4);
    expect(february.flat().every((cell) => cell !== null)).toBe(true);
  });
});

describe('month summary', () => {
  it('counts and averages the tracked nights of that month only', () => {
    const log = { '2026-11-09': 5, '2026-11-10': 8, '2026-10-31': 10, '2025-11-10': 1 };
    expect(monthSummary(log, 2026, 10)).toEqual({ tracked: 2, average: 6.5 });
  });

  it('has no average with nothing tracked', () => {
    expect(monthSummary({}, 2026, 10)).toEqual({ tracked: 0 });
  });
});

describe('sleep statistics', () => {
  it('builds a recent local-day range across month boundaries', () => {
    expect(recentDayKeys(new Date(2026, 10, 2, 9).getTime(), 4)).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(recentDayKeys(NOW, 0)).toEqual([]);
  });

  it('orders tracked nights and skips missing days instead of treating them as zero', () => {
    const log = { '2026-11-08': 6.5, '2026-11-10': 8, '2026-10-01': 9 };
    expect(sleepProgress(log, NOW, 5)).toEqual([
      { key: '2026-11-08', hours: 6.5 },
      { key: '2026-11-10', hours: 8 },
    ]);
  });

  it('summarises average, range and nights with at least seven hours', () => {
    const log = { '2026-11-08': 6, '2026-11-09': 7, '2026-11-10': 8, '2026-11-11': 9 };
    expect(sleepStatistics(log, NOW, 30)).toEqual({
      tracked: 4,
      average: 7.5,
      longest: 9,
      shortest: 6,
      sevenPlus: 3,
      sevenPlusPercent: 75,
    });
  });

  it('returns an empty summary when no night was tracked', () => {
    expect(sleepStatistics({}, NOW)).toEqual({ tracked: 0, sevenPlus: 0 });
  });
});

describe('moving between months', () => {
  it('crosses the year boundary', () => {
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 5, 1)).toEqual({ year: 2026, month: 6 });
  });
});

describe('saving sleep', () => {
  function fakeStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
    const data = { ...initial };
    return {
      data,
      getItem: (key) => (key in data ? data[key] : null),
      setItem: (key, value) => {
        data[key] = value;
      },
    };
  }

  it('survives a save and a load', () => {
    const store = fakeStore();
    expect(saveSleep(store, { '2026-11-10': 7.5, '2026-11-09': 0 })).toBe(true);
    expect(loadSleep(store)).toEqual({ '2026-11-10': 7.5, '2026-11-09': 0 });
  });

  it('is empty when nothing or nonsense was saved', () => {
    expect(loadSleep(fakeStore())).toEqual({});
    expect(loadSleep(fakeStore({ [SLEEP_KEY]: 'not json' }))).toEqual({});
    expect(loadSleep(fakeStore({ [SLEEP_KEY]: '[1,2]' }))).toEqual({});
    expect(loadSleep(fakeStore({ [SLEEP_KEY]: '{"version":1,"nights":[7,8]}' }))).toEqual({});
  });

  it('skips damaged entries and keeps the good ones', () => {
    const nights = { '2026-11-10': 7.2, '2026-02-30': 8, soon: 8, '2026-11-08': -2, '2026-11-07': '8', '2026-11-06': 30 };
    const store = fakeStore({ [SLEEP_KEY]: JSON.stringify({ version: 1, nights }) });
    expect(loadSleep(store)).toEqual({ '2026-11-10': 7.25 });
  });

  it('reports a refused save and survives blocked storage', () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    expect(saveSleep(blocked, { '2026-11-10': 7 })).toBe(false);
    expect(loadSleep(blocked)).toEqual({});
  });
});
