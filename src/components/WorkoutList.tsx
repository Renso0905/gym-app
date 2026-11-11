import type { WeightUnit } from '../lib/storage';
import { displayName, summarize, type Workout } from '../lib/workouts';
import { ConfirmButton } from './ConfirmButton';

interface Props {
  workouts: Workout[];
  unit: WeightUnit;
  onUnitChange: (unit: WeightUnit) => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function describe(workout: Workout, unit: WeightUnit): string {
  const { exercises, sets, volume } = summarize(workout);
  if (exercises === 0) return 'No exercises yet';
  const parts = [plural(exercises, 'exercise'), plural(sets, 'set')];
  if (volume > 0) parts.push(`${volume.toLocaleString()} ${unit}`);
  return parts.join(' · ');
}

export function WorkoutList({ workouts, unit, onUnitChange, onCreate, onOpen, onDuplicate, onDelete }: Props) {
  return (
    <main className="screen">
      <header className="bar">
        <h1>Workouts</h1>
        <div className="segmented" role="group" aria-label="Weight unit">
          {(['lb', 'kg'] as const).map((u) => (
            <button key={u} type="button" aria-pressed={unit === u} onClick={() => onUnitChange(u)}>
              {u}
            </button>
          ))}
        </div>
      </header>

      <button type="button" className="primary wide" onClick={onCreate}>
        + New workout
      </button>

      {workouts.length === 0 ? (
        <p className="empty">No workouts yet. Create your first one and build it exactly how you train.</p>
      ) : (
        <ul className="cards">
          {workouts.map((workout) => (
            <li key={workout.id} className="card">
              <button type="button" className="card-main" onClick={() => onOpen(workout.id)}>
                <span className="card-title">{displayName(workout)}</span>
                <span className="muted">{describe(workout, unit)}</span>
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
