import { useState } from 'react';
import type { WeightUnit } from '../lib/storage';
import {
  addExercise,
  addSet,
  createExercise,
  duplicateExercise,
  moveExercise,
  removeExercise,
  removeSet,
  updateExercise,
  updateSet,
  updateWorkout,
  type Workout,
} from '../lib/workouts';
import { ConfirmButton } from './ConfirmButton';
import { ExerciseCard } from './ExerciseCard';

interface Props {
  workout: Workout;
  unit: WeightUnit;
  saveFailed: boolean;
  onChange: (workout: Workout) => void;
  onDone: () => void;
  onDelete: () => void;
}

export function WorkoutEditor({ workout, unit, saveFailed, onChange, onDone, onDelete }: Props) {
  // The exercise whose name should take focus because it was just added.
  const [newExerciseId, setNewExerciseId] = useState<string | null>(null);
  const now = () => Date.now();

  function handleAddExercise() {
    const exercise = createExercise();
    setNewExerciseId(exercise.id);
    onChange(addExercise(workout, now(), exercise));
  }

  return (
    <main className="screen">
      <header className="bar">
        <button type="button" className="link" onClick={onDone}>
          ‹ Workouts
        </button>
        <span className={saveFailed ? 'status error' : 'status muted'} role="status">
          {saveFailed ? 'Not saved: storage is full or blocked' : 'Saved'}
        </span>
      </header>

      <input
        className="title-input big"
        aria-label="Workout name"
        placeholder="Workout name"
        value={workout.name}
        autoFocus={workout.name === '' && workout.exercises.length === 0}
        enterKeyHint="done"
        onChange={(e) => onChange(updateWorkout(workout, { name: e.currentTarget.value }, now()))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <textarea
        aria-label="Workout notes"
        rows={2}
        placeholder="Notes (optional)"
        value={workout.notes}
        onChange={(e) => onChange(updateWorkout(workout, { notes: e.currentTarget.value }, now()))}
      />

      <ul className="cards">
        {workout.exercises.map((exercise, index) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index}
            count={workout.exercises.length}
            unit={unit}
            autoFocusName={exercise.id === newExerciseId}
            onChange={(patch) => onChange(updateExercise(workout, exercise.id, patch, now()))}
            onMove={(direction) => onChange(moveExercise(workout, exercise.id, direction, now()))}
            onDuplicate={() => onChange(duplicateExercise(workout, exercise.id, now()))}
            onRemove={() => onChange(removeExercise(workout, exercise.id, now()))}
            onAddSet={() => onChange(addSet(workout, exercise.id, now()))}
            onSetChange={(setId, values) => onChange(updateSet(workout, exercise.id, setId, values, now()))}
            onRemoveSet={(setId) => onChange(removeSet(workout, exercise.id, setId, now()))}
          />
        ))}
      </ul>

      <button type="button" className="primary wide" onClick={handleAddExercise}>
        + Add exercise
      </button>

      <div className="footer-actions">
        <button type="button" className="wide" onClick={onDone}>
          Done
        </button>
        <ConfirmButton className="wide" label="Delete workout" confirmLabel="Tap again to delete" onConfirm={onDelete} />
      </div>
    </main>
  );
}
