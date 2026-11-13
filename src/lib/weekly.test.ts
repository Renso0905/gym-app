import { describe, expect, it } from 'vitest';
import { emptyNutrition, type NutritionData } from './nutrition';
import { weekDayKeys, weeklyCalories, weeklySleep } from './weekly';

// Thursday 12 November 2026, mid-afternoon local time.
const now = new Date(2026, 10, 12, 15).getTime();

describe('weekDayKeys', () => {
  it('lists Monday to Sunday of the week containing the day', () => {
    expect(weekDayKeys(now)).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ]);
  });

  it('treats Sunday as the last day of its week', () => {
    expect(weekDayKeys(new Date(2026, 10, 15, 9).getTime())[0]).toBe('2026-11-09');
  });

  it('crosses month and year boundaries', () => {
    expect(weekDayKeys(new Date(2027, 0, 1, 9).getTime())).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03',
    ]);
  });
});

describe('weeklySleep', () => {
  it('averages tracked nights only and compares with last week', () => {
    const log = { '2026-11-09': 7, '2026-11-11': 8, '2026-11-02': 6, '2026-11-08': 6.5 };
    expect(weeklySleep(log, now)).toEqual({ thisWeek: 7.5, lastWeek: 6.25, change: 1.25 });
  });

  it('reports a decrease as a negative change', () => {
    expect(weeklySleep({ '2026-11-10': 6, '2026-11-03': 8 }, now).change).toBe(-2);
  });

  it('has no change unless both weeks are tracked', () => {
    expect(weeklySleep({ '2026-11-10': 7 }, now)).toEqual({ thisWeek: 7 });
    expect(weeklySleep({ '2026-11-03': 7 }, now)).toEqual({ lastWeek: 7 });
    expect(weeklySleep({}, now)).toEqual({});
  });

  it('ignores nights outside the two weeks', () => {
    expect(weeklySleep({ '2026-11-01': 3, '2026-11-16': 3 }, now)).toEqual({});
  });
});

describe('weeklyCalories', () => {
  const food = (calories: number) => ({ id: String(calories), name: 'Food', calories });
  const data: NutritionData = {
    ...emptyNutrition(),
    days: {
      '2026-11-09': [food(1000), food(800)],
      '2026-11-12': [food(2200)],
      '2026-11-10': [],
      '2026-11-05': [food(2100)],
    },
  };

  it('averages calories over days with food and compares with last week', () => {
    expect(weeklyCalories(data, now)).toEqual({ thisWeek: 2000, lastWeek: 2100, change: -100 });
  });

  it('is empty when nothing was logged', () => {
    expect(weeklyCalories(emptyNutrition(), now)).toEqual({});
  });
});
