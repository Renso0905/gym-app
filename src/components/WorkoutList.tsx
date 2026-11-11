import type { Session } from '../lib/sessions';
import type { WeightUnit } from '../lib/storage';
import { displayName, type Workout } from '../lib/workouts';
import { ConfirmButton } from './ConfirmButton';

interface Props {
  workouts: Workout[];
  active: Session | null;
  unit: WeightUnit;
  onUnitChange: (unit: WeightUnit) => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (routine: Workout | null) => void;
  onResume: () => void;
}

function outline(workout: Workout): string {
  if (workout.exercises.length === 0) return 'No exercises yet';
  const names = workout.exercises.map((e) => e.name.trim() || 'Exercise');
  return names.length > 4 ? `${names.slice(0, 4).join(', ')} +${names.length - 4} more` : names.join(', ');
}

export function WorkoutList({ workouts, active, unit, onUnitChange, onCreate, onOpen, onDuplicate, onDelete, onStart, onResume }: Props) {
  return (
    <main className="screen with-tabs">
      <header className="bar">
        <h1>Routines</h1>
        <div className="segmented" role="group" aria-label="Weight unit">
          {(['lb', 'kg'] as const).map((u) => (
            <button key={u} type="button" aria-pressed={unit === u} onClick={() => onUnitChange(u)}>
              {u}
            </button>
          ))}
        </div>
      </header>

      {active && (
        <button type="button" className="banner" onClick={onResume}>
          <span>
            <strong>{displayName(active, 'Workout')}</strong> in progress
          </span>
          <span>Resume ›</span>
        </button>
      )}

      <div className="row-actions">
        <button type="button" className="primary" onClick={onCreate}>
          + New routine
        </button>
        <button type="button" disabled={active !== null} onClick={() => onStart(null)}>
          Empty workout
        </button>
      </div>

      {workouts.length === 0 ? (
        <p className="empty">No routines yet. A routine is the outline of a workout; create one, then start it and fill in your numbers as you lift.</p>
      ) : (
        <ul className="cards">
          {workouts.map((workout) => (
            <li key={workout.id} className="card">
              <button type="button" className="card-main" onClick={() => onOpen(workout.id)}>
                <span className="card-title">{displayName(workout)}</span>
                <span className="muted">{outline(workout)}</span>
              </button>
              <button type="button" className="primary wide" disabled={active !== null || workout.exercises.length === 0} onClick={() => onStart(workout)}>
                Start workout
              </button>
              <div className="row-actions">
                <button type="button" onClick={() => onOpen(workout.id)}>
                  Edit
                </button>
                <button type="button" onClick={() => onDuplicate(workout.id)}>
                  Duplicate
                </button>
                <ConfirmButton label="Delete" confirmLabel="Confirm" onConfirm={() => onDelete(workout.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
