import { durationMinutes, sortHistory, type Session } from '../lib/sessions';
import type { WeightUnit } from '../lib/storage';
import { displayName, formatSet, summarize } from '../lib/workouts';
import { ConfirmButton } from './ConfirmButton';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function when(session: Session): string {
  return new Date(session.finishedAt ?? session.startedAt).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function stats(session: Session, unit: WeightUnit): string {
  const { sets, volume } = summarize(session);
  const parts = [`${durationMinutes(session, Date.now())} min`, plural(sets, 'set')];
  if (volume > 0) parts.push(`${volume.toLocaleString()} ${unit}`);
  return parts.join(' · ');
}

interface ListProps {
  history: Session[];
  unit: WeightUnit;
  onOpen: (id: string) => void;
  onBack: () => void;
}

// R4/R16: the full list of finished workouts, opened from the Progress tab.
export function HistoryList({ history, unit, onOpen, onBack }: ListProps) {
  const sessions = sortHistory(history);
  return (
    <main className="screen">
      <header className="bar">
        <button type="button" className="link" onClick={onBack}>
          ‹ Progress
        </button>
      </header>
      <h1>History</h1>
      {sessions.length === 0 ? (
        <p className="empty">Finished workouts appear here, newest first.</p>
      ) : (
        <ul className="cards">
          {sessions.map((session) => (
            <li key={session.id} className="card">
              <button type="button" className="card-main" onClick={() => onOpen(session.id)}>
                <span className="card-title">{displayName(session, 'Workout')}</span>
                <span className="muted">{when(session)}</span>
                <span className="muted">{stats(session, unit)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

interface DetailProps {
  session: Session;
  unit: WeightUnit;
  onBack: () => void;
  onDelete: () => void;
}

export function HistoryDetail({ session, unit, onBack, onDelete }: DetailProps) {
  return (
    <main className="screen">
      <header className="bar">
        <button type="button" className="link" onClick={onBack}>
          ‹ History
        </button>
      </header>
      <h1>{displayName(session, 'Workout')}</h1>
      <p className="muted">
        {when(session)} · {stats(session, unit)}
      </p>
      <ul className="cards">
        {session.exercises.map((exercise) => (
          <li key={exercise.id} className="card">
            <h2 className="exercise-title">{exercise.name.trim() || 'Exercise'}</h2>
            <ol className="logged-sets">
              {exercise.sets.map((set) => (
                <li key={set.id}>{formatSet(exercise.kind, set) || 'Done'}</li>
              ))}
            </ol>
            {exercise.notes.trim() && <p className="muted">{exercise.notes}</p>}
          </li>
        ))}
      </ul>
      <div className="footer-actions">
        <ConfirmButton className="wide" label="Delete this workout" confirmLabel="Tap again to delete" onConfirm={onDelete} />
      </div>
    </main>
  );
}
