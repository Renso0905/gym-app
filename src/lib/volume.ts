import { isValidSet, type WorkoutSet } from './sets';

/** R2: total training volume in kilograms, reps x weight summed over the valid sets. */
export function totalVolume(sets: WorkoutSet[]): number {
  return sets.filter(isValidSet).reduce((total, set) => total + set.reps + set.weightKg, 0);
}
