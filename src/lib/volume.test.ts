import { describe, expect, it } from 'vitest';
import { totalVolume } from './volume';

describe('totalVolume (R2)', () => {
  it('is 0 for an empty workout', () => {
    expect(totalVolume([])).toBe(0);
  });

  it('multiplies reps by weight for a single set', () => {
    expect(totalVolume([{ exercise: 'Squat', reps: 5, weightKg: 100 }])).toBe(500);
  });

  it('sums across sets', () => {
    expect(
      totalVolume([
        { exercise: 'Squat', reps: 5, weightKg: 100 },
        { exercise: 'Bench press', reps: 8, weightKg: 60 },
      ]),
    ).toBe(980);
  });

  it('ignores invalid sets', () => {
    expect(
      totalVolume([
        { exercise: 'Squat', reps: 5, weightKg: 100 },
        { exercise: '', reps: 5, weightKg: 100 },
        { exercise: 'Squat', reps: -3, weightKg: 100 },
      ]),
    ).toBe(500);
  });

  it('counts bodyweight sets as zero volume', () => {
    expect(totalVolume([{ exercise: 'Pull-up', reps: 10, weightKg: 0 }])).toBe(0);
  });
});
