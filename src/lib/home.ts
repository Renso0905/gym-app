import type { Workout } from './workouts';

/**
 * The routine shown by the Home launcher. Keep the chosen routine when it
 * still exists; otherwise fall back to the first routine in display order.
 */
export function homeWorkout(workouts: readonly Workout[], chosenId: string): Workout | undefined {
  return workouts.find((workout) => workout.id === chosenId) ?? workouts[0];
}
