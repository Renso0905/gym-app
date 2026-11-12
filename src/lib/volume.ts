import { isValidSet, type WorkoutSet } from './sets';

/** R2: total training volume, reps x weight summed over the valid sets. */
export function totalVolume(sets: WorkoutSet[]): number {
  return sets.filter(isValidSet).reduce((total, set) => total + set.reps * set.weight, 0);
}
