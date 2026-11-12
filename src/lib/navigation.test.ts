import { describe, expect, it } from 'vitest';
import { ROOT_TABS } from './navigation';

describe('root navigation', () => {
  it('groups workout progress under Workouts instead of giving it a separate tab', () => {
    expect(ROOT_TABS.map((tab) => tab.label)).toEqual(['Home', 'Workouts', 'Nutrition', 'Sleep']);
    expect(ROOT_TABS.some((tab) => tab.id === ('progress' as string))).toBe(false);
  });
});
