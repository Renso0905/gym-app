// R22: Home weekly averages. A week runs Monday to Sunday in local calendar
// days. Averages cover tracked days only, so a missing day is never a zero.
import { nutritionTotals, type NutritionData } from './nutrition';
import { dayKey, type SleepLog } from './sleep';

/** The seven day keys of the Monday-first week containing `time`, Monday first. */
export function weekDayKeys(time: number): string[] {
  const date = new Date(time);
  const sinceMonday = (date.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate() - sinceMonday + index, 12);
    return dayKey(day.getFullYear(), day.getMonth(), day.getDate());
  });
}

/** The same moment one week earlier, by calendar days. */
function weekBefore(time: number): number {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7, 12).getTime();
}

function average(values: number[]): number | undefined {
  return values.length === 0 ? undefined : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export interface WeeklyComparison {
  /** Mean over this week's tracked days; absent when none are tracked. */
  thisWeek?: number;
  /** Mean over last week's tracked days; absent when none are tracked. */
  lastWeek?: number;
  /** thisWeek minus lastWeek; absent unless both weeks have data. */
  change?: number;
}

function compare(thisWeek: number | undefined, lastWeek: number | undefined): WeeklyComparison {
  const result: WeeklyComparison = {};
  if (thisWeek !== undefined) result.thisWeek = thisWeek;
  if (lastWeek !== undefined) result.lastWeek = lastWeek;
  if (thisWeek !== undefined && lastWeek !== undefined) result.change = thisWeek - lastWeek;
  return result;
}

function sleepAverage(log: SleepLog, keys: string[]): number | undefined {
  return average(keys.filter((key) => key in log).map((key) => log[key]));
}

function calorieAverage(data: NutritionData, keys: string[]): number | undefined {
  return average(
    keys.filter((key) => (data.days[key]?.length ?? 0) > 0).map((key) => nutritionTotals(data.days[key]).calories),
  );
}

/** Average nightly sleep this week compared with last week. */
export function weeklySleep(log: SleepLog, now: number): WeeklyComparison {
  return compare(sleepAverage(log, weekDayKeys(now)), sleepAverage(log, weekDayKeys(weekBefore(now))));
}

/** Average daily calories this week compared with last week. */
export function weeklyCalories(data: NutritionData, now: number): WeeklyComparison {
  return compare(calorieAverage(data, weekDayKeys(now)), calorieAverage(data, weekDayKeys(weekBefore(now))));
}
