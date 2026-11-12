import { describe, expect, it } from 'vitest';
import {
  addFood,
  cleanGoalAmount,
  cleanNutritionAmount,
  createFoodEntry,
  emptyNutrition,
  formatNutritionAmount,
  nutritionTotals,
  removeFood,
  setNutritionGoals,
  shiftDayKey,
} from './nutrition';
import { loadNutrition, NUTRITION_KEY, saveNutrition, type KeyValueStore } from './storage';

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

describe('nutrition amounts and goals', () => {
  it('accepts non-negative amounts and rounds to two decimal places', () => {
    expect(cleanNutritionAmount(0)).toBe(0);
    expect(cleanNutritionAmount(12.345)).toBe(12.35);
    expect(cleanNutritionAmount(-1)).toBeUndefined();
    expect(cleanNutritionAmount(Number.NaN)).toBeUndefined();
    expect(cleanNutritionAmount('12')).toBeUndefined();
  });

  it('requires goals above zero and keeps macros optional', () => {
    expect(cleanGoalAmount(0)).toBeUndefined();
    expect(cleanGoalAmount(30)).toBe(30);
    const start = emptyNutrition();
    const changed = setNutritionGoals(start, { calories: 2400, protein: 180, fiber: 30 });
    expect(changed.goals).toEqual({ calories: 2400, protein: 180, fiber: 30 });
    expect(setNutritionGoals(changed, { calories: undefined, protein: undefined, fiber: 0 }).goals).toEqual({ calories: 2400 });
  });
});

describe('daily food log', () => {
  const breakfast = createFoodEntry({ name: '  Greek yogurt  ', calories: 180, protein: 20, fiber: 0 }, 'food-1')!;
  const oats = createFoodEntry({ name: 'Oats', calories: 300, protein: 10, fiber: 8 }, 'food-2')!;

  it('creates a clean entry and rejects one without a name or calories', () => {
    expect(breakfast).toEqual({ id: 'food-1', name: 'Greek yogurt', calories: 180, protein: 20, fiber: 0 });
    expect(createFoodEntry({ name: ' ', calories: 100 }, 'x')).toBeNull();
    expect(createFoodEntry({ name: 'Apple', calories: undefined }, 'x')).toBeNull();
  });

  it('adds and removes foods without changing the original data', () => {
    const start = emptyNutrition();
    const one = addFood(start, '2026-11-11', breakfast);
    const two = addFood(one, '2026-11-11', oats);
    expect(start.days).toEqual({});
    expect(two.days['2026-11-11']).toEqual([breakfast, oats]);
    expect(addFood(two, 'not-a-day', oats)).toBe(two);
    expect(addFood(two, '2026-11-11', oats)).toBe(two);
    expect(removeFood(two, '2026-11-11', 'food-1').days['2026-11-11']).toEqual([oats]);
    expect(removeFood(one, '2026-11-11', 'food-1').days).toEqual({});
  });

  it('totals calories, protein and fiber, treating omitted macros as zero', () => {
    expect(nutritionTotals([breakfast, oats, { id: 'food-3', name: 'Coffee', calories: 5 }])).toEqual({
      calories: 485,
      protein: 30,
      fiber: 8,
    });
  });

  it('moves across month and year boundaries and formats short values', () => {
    expect(shiftDayKey('2026-11-01', -1)).toBe('2026-10-31');
    expect(shiftDayKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDayKey('bad', 1)).toBe('bad');
    expect(formatNutritionAmount(12.345)).toBe('12.35');
  });
});

describe('nutrition storage', () => {
  it('defaults to a 2,000 calorie goal and saves a versioned format', () => {
    const store = fakeStore();
    expect(loadNutrition(store)).toEqual(emptyNutrition());
    const data = setNutritionGoals(emptyNutrition(), { calories: 2300, protein: 170 });
    expect(saveNutrition(store, data)).toBe(true);
    expect(loadNutrition(store)).toEqual(data);
    expect(JSON.parse(store.data[NUTRITION_KEY])).toEqual({ version: 1, ...data });
  });

  it('repairs damaged goals, days and entries without throwing', () => {
    const store = fakeStore({
      [NUTRITION_KEY]: JSON.stringify({
        goals: { calories: -5, protein: 160, fiber: 'lots' },
        days: {
          '2026-11-11': [
            { id: 'ok', name: ' Apple ', calories: 95, fiber: 4.4 },
            { id: 'bad-calories', name: 'Mystery', calories: 'many' },
            { id: 'bad-name', name: '', calories: 10 },
            { id: 'ok', name: 'Duplicate', calories: 50 },
          ],
          yesterday: [{ id: 'x', name: 'Invalid day', calories: 1 }],
        },
      }),
    });
    expect(loadNutrition(store)).toEqual({
      goals: { calories: 2000, protein: 160 },
      days: { '2026-11-11': [{ id: 'ok', name: 'Apple', calories: 95, fiber: 4.4 }] },
    });
    expect(loadNutrition(fakeStore({ [NUTRITION_KEY]: '{' }))).toEqual(emptyNutrition());
  });

  it('survives storage that is blocked', () => {
    const blocked: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(loadNutrition(blocked)).toEqual(emptyNutrition());
    expect(saveNutrition(blocked, emptyNutrition())).toBe(false);
  });
});
