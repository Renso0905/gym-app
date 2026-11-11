/** One set of one exercise. Domain logic in src/lib must stay free of React. */
export interface WorkoutSet {
  exercise: string;
  reps: number;
  weightKg: number;
}

/** A set is valid when it names an exercise, has at least one whole rep, and a non-negative weight. */
export function isValidSet(set: WorkoutSet): boolean {
  return (
    set.exercise.trim().length > 0 &&
    Number.isInteger(set.reps) &&
    set.reps > 0 &&
    Number.isFinite(set.weightKg) &&
    set.weightKg >= 0
  );
}
