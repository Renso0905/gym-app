// R17: daily calorie and macro tracking. Nutrition is stored by local
// calendar day so an entry does not move when the clock or time zone changes.
import { dayKey, parseDayKey } from './sleep';

export interface NutritionGoals {
  calories: number;
  protein?: number;
  fiber?: number;
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  fiber?: number;
}

export interface NutritionData {
  goals: NutritionGoals;
  days: Readonly<Record<string, readonly FoodEntry[]>>;
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  fiber: number;
}

export const DEFAULT_CALORIE_GOAL = 2000;

export function emptyNutrition(): NutritionData {
  return { goals: { calories: DEFAULT_CALORIE_GOAL }, days: {} };
}

/** A usable nutrition amount, rounded to two decimal places. */
export function cleanNutritionAmount(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value * 100) / 100;
}

/** Goals must be above zero. An absent protein or fiber goal stays optional. */
export function cleanGoalAmount(value: unknown): number | undefined {
  const clean = cleanNutritionAmount(value);
  return clean !== undefined && clean > 0 ? clean : undefined;
}

export function setNutritionGoals(data: NutritionData, next: Partial<NutritionGoals>): NutritionData {
  const calories = cleanGoalAmount(next.calories) ?? data.goals.calories;
  const protein = cleanGoalAmount(next.protein);
  const fiber = cleanGoalAmount(next.fiber);
  const goals: NutritionGoals = { calories };
  if (protein !== undefined) goals.protein = protein;
  if (fiber !== undefined) goals.fiber = fiber;
  return { ...data, goals };
}

export interface FoodDraft {
  name: string;
  calories: number | undefined;
  protein?: number;
  fiber?: number;
}

/** Builds a food entry, or null when the name or calories are unusable. */
export function createFoodEntry(draft: FoodDraft, id: string): FoodEntry | null {
  const name = draft.name.trim();
  const calories = cleanNutritionAmount(draft.calories);
  if (id === '' || name === '' || calories === undefined) return null;
  const entry: FoodEntry = { id, name, calories };
  const protein = cleanNutritionAmount(draft.protein);
  const fiber = cleanNutritionAmount(draft.fiber);
  if (protein !== undefined) entry.protein = protein;
  if (fiber !== undefined) entry.fiber = fiber;
  return entry;
}

export function addFood(data: NutritionData, key: string, entry: FoodEntry): NutritionData {
  if (!parseDayKey(key)) return data;
  const current = data.days[key] ?? [];
  if (current.some((food) => food.id === entry.id)) return data;
  return { ...data, days: { ...data.days, [key]: [...current, entry] } };
}

export function removeFood(data: NutritionData, key: string, id: string): NutritionData {
  const current = data.days[key];
  if (!current?.some((food) => food.id === id)) return data;
  const next = current.filter((food) => food.id !== id);
  const days = { ...data.days };
  if (next.length === 0) delete days[key];
  else days[key] = next;
  return { ...data, days };
}

export function nutritionTotals(entries: readonly FoodEntry[]): NutritionTotals {
  return entries.reduce(
    (total, entry) => ({
      calories: total.calories + entry.calories,
      protein: total.protein + (entry.protein ?? 0),
      fiber: total.fiber + (entry.fiber ?? 0),
    }),
    { calories: 0, protein: 0, fiber: 0 },
  );
}

/** The adjacent local calendar day. */
export function shiftDayKey(key: string, direction: -1 | 1): string {
  const parts = parseDayKey(key);
  if (!parts) return key;
  const date = new Date(parts.year, parts.month, parts.day + direction);
  return dayKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatNutritionAmount(value: number): string {
  return String(Math.round(value * 100) / 100);
}
