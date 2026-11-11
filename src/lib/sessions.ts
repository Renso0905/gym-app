// R3 and R4: a session is one workout performed on one day. It starts as a copy
// of a routine's outline (or empty), the lifter fills in and ticks off sets,
// and finishing it puts it in the history.
import {
  copyExercise,
  displayName,
  exerciseKey,
  FIELDS_BY_KIND,
  newId,
  type Exercise,
  type PlannedSet,
  type SetValues,
  type Workout,
} from './workouts';

export interface Session extends Workout {
  /** The routine this was started from, if any. */
  routineId?: string;
  startedAt: number;
  /** Set when the session is finished; absent while it is in progress. */
  finishedAt?: number;
}

/**
 * Starts a session. With a routine, its exercises and target numbers are
 * copied in, nothing ticked. Without one, the session starts empty.
 */
export function startSession(routine: Workout | null, now: number, id: string = newId()): Session {
  return {
    id,
    routineId: routine?.id,
    name: routine ? displayName(routine) : 'Workout',
    notes: '',
    exercises: routine ? routine.exercises.map(copyExercise) : [],
    createdAt: now,
    updatedAt: now,
    startedAt: now,
  };
}

function hasValues(exercise: Exercise, set: SetValues): boolean {
  return FIELDS_BY_KIND[exercise.kind].some((field) => set[field] !== undefined);
}

/**
 * Ticks a set as done, or unticks it. Ticking a set that has no numbers yet
 * fills it from `previous` (what was done last time), so repeating last
 * week's set is a single tap.
 */
export function toggleSetDone(session: Session, exerciseId: string, setId: string, previous: SetValues | undefined, now: number): Session {
  const exercise = session.exercises.find((e) => e.id === exerciseId);
  if (!exercise?.sets.some((s) => s.id === setId)) return session;
  return {
    ...session,
    updatedAt: now,
    exercises: session.exercises.map((e) =>
      e.id !== exerciseId
        ? e
        : {
            ...e,
            sets: e.sets.map((s) => {
              if (s.id !== setId) return s;
              if (s.done) return { ...s, done: false };
              const fill: SetValues = {};
              if (previous && !hasValues(e, s)) {
                for (const field of FIELDS_BY_KIND[e.kind]) fill[field] = previous[field];
              }
              return { ...s, ...fill, done: true };
            }),
          },
    ),
  };
}

export function doneSetCount(session: Session): number {
  return session.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
}

/**
 * Finishes a session: only ticked sets are kept, and exercises with none are
 * dropped. Returns null when nothing was done, because there is nothing to log.
 */
export function finishSession(session: Session, now: number): Session | null {
  const exercises = session.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
    .filter((e) => e.sets.length > 0);
  if (exercises.length === 0) return null;
  return { ...session, exercises, finishedAt: now, updatedAt: now };
}

/** Finished sessions, most recent first. */
export function sortHistory(history: Session[]): Session[] {
  return [...history].sort((a, b) => (b.finishedAt ?? b.startedAt) - (a.finishedAt ?? a.startedAt));
}

/**
 * The sets logged for this exercise the last time it was performed, in any
 * session. Empty when it has never been logged.
 */
export function previousSets(history: Session[], exercise: Pick<Exercise, 'defId' | 'name'>): PlannedSet[] {
  const key = exerciseKey(exercise);
  for (const session of sortHistory(history)) {
    const match = session.exercises.find((e) => exerciseKey(e) === key && e.sets.length > 0);
    if (match) return match.sets;
  }
  return [];
}

/** Whole minutes the session took (or has taken so far, given `now`). */
export function durationMinutes(session: Session, now: number): number {
  return Math.max(0, Math.round(((session.finishedAt ?? now) - session.startedAt) / 60000));
}

/** Elapsed time as m:ss or h:mm:ss, for the running clock. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
