import { useEffect, useState } from 'react';
import { doneSetCount, formatElapsed, toggleSetDone, type Session } from '../lib/sessions';
import type { WeightUnit } from '../lib/storage';
import { updateWorkout } from '../lib/workouts';
import { ConfirmButton } from './ConfirmButton';
import { ExerciseList } from './ExerciseList';

interface Props {
  session: Session;
  history: Session[];
  unit: WeightUnit;
  saveFailed: boolean;
  onChange: (session: Session) => void;
  onAddExercises: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  onBack: () => void;
}

function Clock({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <span className="clock" role="timer" aria-label="Workout time">
      {formatElapsed(now - since)}
    </span>
  );
}

/** A workout being performed: fill in the numbers, tick each set, then finish. */
export function SessionScreen({ session, history, unit, saveFailed, onChange, onAddExercises, onFinish, onDiscard, onBack }: Props) {
  const done = doneSetCount(session);

  return (
    <main className="screen">
      <header className="bar sticky">
        <button type="button" className="link" onClick={onBack}>
          ‹ Back
        </button>
        <Clock since={session.startedAt} />
        <button type="button" className="primary" disabled={done === 0} onClick={onFinish}>
          Finish
        </button>
      </header>

      {saveFailed && (
        <p className="status error" role="alert">
          Not saved: storage is full or blocked
        </p>
      )}

      <input
        className="title-input big"
        aria-label="Workout name"
        placeholder="Workout name"
        value={session.name}
        enterKeyHint="done"
        onChange={(e) => onChange(updateWorkout(session, { name: e.currentTarget.value }, Date.now()))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />

      {session.exercises.length === 0 ? (
        <p className="empty">Add an exercise to start logging.</p>
      ) : (
        <ExerciseList
          plan={session}
          unit={unit}
          mode="log"
          history={history}
          onChange={onChange}
          onToggleDone={(exerciseId, setId, previous) => onChange(toggleSetDone(session, exerciseId, setId, previous, Date.now()))}
        />
      )}

      <button type="button" className="wide" onClick={onAddExercises}>
        + Add exercises
      </button>

      <div className="footer-actions">
        <p className="muted center">{done === 0 ? 'Tick a set with ✓ when you have done it.' : `${done} set${done === 1 ? '' : 's'} done. Unticked sets are not saved.`}</p>
        <button type="button" className="primary wide" disabled={done === 0} onClick={onFinish}>
          Finish workout
        </button>
        <ConfirmButton className="wide" label="Discard workout" confirmLabel="Tap again to discard" onConfirm={onDiscard} />
      </div>
    </main>
  );
}
