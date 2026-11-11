import type { Session } from '../lib/sessions';
import { previousSets } from '../lib/sessions';
import type { WeightUnit } from '../lib/storage';
import {
  addSet,
  duplicateExercise,
  moveExercise,
  removeExercise,
  removeSet,
  updateExercise,
  updateSet,
  type Plan,
  type SetValues,
} from '../lib/workouts';
import { ExerciseCard } from './ExerciseCard';

interface Props<T extends Plan> {
  plan: T;
  unit: WeightUnit;
  mode: 'plan' | 'log';
  /** Log mode: finished sessions to read last time's numbers from. */
  history?: Session[];
  onChange: (plan: T) => void;
  onToggleDone?: (exerciseId: string, setId: string, previous: SetValues | undefined) => void;
}

/** The exercise cards of a routine or a session, wired to the shared editing rules. */
export function ExerciseList<T extends Plan>({ plan, unit, mode, history = [], onChange, onToggleDone }: Props<T>) {
  const now = () => Date.now();
  return (
    <ul className="cards">
      {plan.exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          index={index}
          count={plan.exercises.length}
          unit={unit}
          mode={mode}
          previous={mode === 'log' ? previousSets(history, exercise) : undefined}
          onChange={(patch) => onChange(updateExercise(plan, exercise.id, patch, now()))}
          onMove={(direction) => onChange(moveExercise(plan, exercise.id, direction, now()))}
          onDuplicate={() => onChange(duplicateExercise(plan, exercise.id, now()))}
          onRemove={() => onChange(removeExercise(plan, exercise.id, now()))}
          onAddSet={() => onChange(addSet(plan, exercise.id, now()))}
          onSetChange={(setId, values) => onChange(updateSet(plan, exercise.id, setId, values, now()))}
          onRemoveSet={(setId) => onChange(removeSet(plan, exercise.id, setId, now()))}
          onToggleDone={(setId, previous) => onToggleDone?.(exercise.id, setId, previous)}
        />
      ))}
    </ul>
  );
}
