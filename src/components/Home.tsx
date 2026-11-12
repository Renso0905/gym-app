// R13 and R19: the Home tab and its workout launcher widget.
import { useEffect, useState, type ReactNode } from 'react';
import { homeWorkout } from '../lib/home';
import type { Session } from '../lib/sessions';
import type { WeightUnit } from '../lib/storage';
import { displayName, type Workout } from '../lib/workouts';

/** What a widget is given to draw itself from. */
export interface HomeData {
  routines: Workout[];
  history: Session[];
  unit: WeightUnit;
}

export interface HomeWidget {
  id: string;
  title: string;
  render: (data: HomeData, actions: HomeActions) => ReactNode;
}

export interface HomeActions {
  active: Session | null;
  chosenWorkoutId: string;
  onChooseWorkout: (id: string) => void;
  onStart: (workout: Workout) => void;
  onOpenRoutines: () => void;
}

function WorkoutLauncher({ data, actions }: { data: HomeData; actions: HomeActions }) {
  const [swapping, setSwapping] = useState(false);
  const chosen = homeWorkout(data.routines, actions.chosenWorkoutId);

  useEffect(() => {
    if ((chosen?.id ?? '') !== actions.chosenWorkoutId) actions.onChooseWorkout(chosen?.id ?? '');
  }, [actions, chosen]);

  if (!chosen) {
    return (
      <div className="home-workout-empty">
        <p className="muted">Create a routine, then you can launch it right from Home.</p>
        <button type="button" className="wide" onClick={actions.onOpenRoutines}>Go to Routines</button>
      </div>
    );
  }

  return (
    <div className="home-workout">
      <div className="home-workout-heading">
        <div>
          <p className="eyebrow">Selected workout</p>
          <strong>{displayName(chosen)}</strong>
          <span className="muted">
            {chosen.exercises.length} {chosen.exercises.length === 1 ? 'exercise' : 'exercises'}
          </span>
        </div>
        <span className="workout-mark" aria-hidden="true">↗</span>
      </div>

      {chosen.exercises.length === 0 ? (
        <p className="muted">This routine is empty. You can still start it and add exercises as you go.</p>
      ) : (
        <ol className="home-exercises">
          {chosen.exercises.slice(0, 4).map((exercise) => (
            <li key={exercise.id}>{exercise.name.trim() || 'Unnamed exercise'}</li>
          ))}
          {chosen.exercises.length > 4 && <li className="muted">+{chosen.exercises.length - 4} more</li>}
        </ol>
      )}

      {swapping && (
        <div className="workout-choices" aria-label="Choose a workout">
          {data.routines.map((workout) => (
            <button
              key={workout.id}
              type="button"
              aria-pressed={workout.id === chosen.id}
              onClick={() => {
                actions.onChooseWorkout(workout.id);
                setSwapping(false);
              }}
            >
              <span>{displayName(workout)}</span>
              <small>{workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}</small>
            </button>
          ))}
        </div>
      )}

      <div className="home-workout-actions">
        <button type="button" disabled={data.routines.length < 2} onClick={() => setSwapping((open) => !open)}>
          {swapping ? 'Cancel' : 'Swap workout'}
        </button>
        <button type="button" className="primary" disabled={actions.active !== null} onClick={() => actions.onStart(chosen)}>
          {actions.active ? 'Workout in progress' : 'Start workout'}
        </button>
      </div>
    </div>
  );
}

export const HOME_WIDGETS: readonly HomeWidget[] = [
  {
    id: 'workout-launcher',
    title: 'Workout',
    render: (data, actions) => <WorkoutLauncher data={data} actions={actions} />,
  },
];

interface Props {
  data: HomeData;
  active: Session | null;
  chosenWorkoutId: string;
  onChooseWorkout: (id: string) => void;
  onResume: () => void;
  onStart: (workout: Workout) => void;
  onOpenRoutines: () => void;
  widgets?: readonly HomeWidget[];
}

export function Home({
  data,
  active,
  chosenWorkoutId,
  onChooseWorkout,
  onResume,
  onStart,
  onOpenRoutines,
  widgets = HOME_WIDGETS,
}: Props) {
  const actions: HomeActions = { active, chosenWorkoutId, onChooseWorkout, onStart, onOpenRoutines };
  return (
    <main className="screen with-tabs">
      <header className="bar">
        <h1>Home</h1>
      </header>

      {active && (
        <button type="button" className="banner" onClick={onResume}>
          <span>
            <strong>{displayName(active, 'Workout')}</strong> in progress
          </span>
          <span>Resume ›</span>
        </button>
      )}

      {widgets.length === 0 ? (
        <p className="empty">Nothing here yet. Widgets you choose will appear on this screen.</p>
      ) : (
        <ul className="cards">
          {widgets.map((widget) => (
            <li key={widget.id} className="card">
              <h2 className="section-title">{widget.title}</h2>
              {widget.render(data, actions)}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
