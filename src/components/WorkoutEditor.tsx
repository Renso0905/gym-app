import type { WeightUnit } from '../lib/storage';
import { updateWorkout, type Workout } from '../lib/workouts';
import { ConfirmButton } from './ConfirmButton';
import { ExerciseList } from './ExerciseList';

interface Props {
  workout: Workout;
  unit: WeightUnit;
  saveFailed: boolean;
  canStart: boolean;
  onChange: (workout: Workout) => void;
  onAddExercises: () => void;
  onStart: () => void;
  onDone: () => void;
  onDelete: () => void;
}

/** Edits a routine: the outline of a workout, with optional target numbers per set. */
export function WorkoutEditor({ workout, unit, saveFailed, canStart, onChange, onAddExercises, onStart, onDone, onDelete }: Props) {
  return (
    <main className="screen">
      <header className="bar">
        <button type="button" className="link" onClick={onDone}>
          ‹ Routines
        </button>
        <span className={saveFailed ? 'status error' : 'status muted'} role="status">
          {saveFailed ? 'Not saved: storage is full or blocked' : 'Saved'}
        </span>
      </header>

      <input
        className="title-input big"
        aria-label="Routine name"
        placeholder="Routine name"
        value={workout.name}
        autoFocus={workout.name === '' && workout.exercises.length === 0}
        enterKeyHint="done"
        onChange={(e) => onChange(updateWorkout(workout, { name: e.currentTarget.value }, Date.now()))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <textarea
        aria-label="Routine notes"
        rows={2}
        placeholder="Notes (optional)"
        value={workout.notes}
        onChange={(e) => onChange(updateWorkout(workout, { notes: e.currentTarget.value }, Date.now()))}
      />

      {workout.exercises.length === 0 ? (
        <p className="empty">Add the exercises for this routine. Set the number of sets now; fill in target numbers only if you want them.</p>
      ) : (
        <ExerciseList plan={workout} unit={unit} mode="plan" onChange={onChange} />
      )}

      <button type="button" className="primary wide" onClick={onAddExercises}>
        + Add exercises
      </button>

      <div className="footer-actions">
        <button type="button" className="wide" disabled={!canStart || workout.exercises.length === 0} onClick={onStart}>
          Start this workout
        </button>
        <ConfirmButton className="wide" label="Delete routine" confirmLabel="Tap again to delete" onConfirm={onDelete} />
      </div>
    </main>
  );
}
