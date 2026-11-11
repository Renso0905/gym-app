import { describe, expect, it } from 'vitest';
import { isValidSet } from './sets';

describe('isValidSet', () => {
  it('accepts a normal set', () => {
    expect(isValidSet({ exercise: 'Squat', reps: 5, weightKg: 100 })).toBe(true);
  });

  it('accepts bodyweight exercises with zero added weight', () => {
    expect(isValidSet({ exercise: 'Pull-up', reps: 10, weightKg: 0 })).toBe(true);
  });

  it('rejects a blank exercise name', () => {
    expect(isValidSet({ exercise: '  ', reps: 5, weightKg: 100 })).toBe(false);
  });

  it('rejects zero, negative or fractional reps', () => {
    expect(isValidSet({ exercise: 'Squat', reps: 0, weightKg: 100 })).toBe(false);
    expect(isValidSet({ exercise: 'Squat', reps: -1, weightKg: 100 })).toBe(false);
    expect(isValidSet({ exercise: 'Squat', reps: 2.5, weightKg: 100 })).toBe(false);
  });

  it('rejects negative or non-finite weight', () => {
    expect(isValidSet({ exercise: 'Squat', reps: 5, weightKg: -5 })).toBe(false);
    expect(isValidSet({ exercise: 'Squat', reps: 5, weightKg: Number.NaN })).toBe(false);
  });
});
