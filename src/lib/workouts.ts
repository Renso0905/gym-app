// R7: reusable workout plans. Every function returns a new value; nothing is mutated.
import { totalVolume } from './volume';

export type ExerciseKind = 'weight-reps' | 'reps' | 'time' | 'distance';

export const EXERCISE_KINDS: ReadonlyArray<{ kind: ExerciseKind; label: string }> = [
  { kind: 'weight-reps', label: 'Weight and reps' },
  { kind: 'reps', label: 'Reps only' },
  { kind: 'time', label: 'Time' },
  { kind: 'distance', label: 'Distance and time' },
];

export type SetField = 'weight' | 'reps' | 'seconds' | 'distance';

/** Which values a set records for each kind of exercise, in display order. */
export const FIELDS_BY_KIND: Readonly<Record<ExerciseKind, readonly SetField[]>> = {
  'weight-reps': ['weight', 'reps'],
  reps: ['reps'],
  time: ['seconds'],
  distance: ['distance', 'seconds'],
};

export interface PlannedSet {
  id: string;
  weight?: number;
  reps?: number;
  seconds?: number;
  distance?: number;
}

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  notes: string;
  restSeconds?: number;
  sets: PlannedSet[];
}

export interface Workout {
  id: string;
  name: string;
  notes: string;
  exercises: Exercise[];
  createdAt: number;
  updatedAt: number;
}

export type SetValues = Partial<Record<SetField, number | undefined>>;
export type ExercisePatch = Partial<Pick<Exercise, 'name' | 'kind' | 'notes' | 'restSeconds'>>;
export type WorkoutPatch = Partial<Pick<Workout, 'name' | 'notes'>>;

export function newId(): string {
  // randomUUID needs a secure context; the fallback covers plain-http testing on a phone.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** A usable amount: finite and not negative. Anything else means "not set". */
export function cleanNumber(value: unknown, integer = false): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return integer ? Math.floor(value) : value;
}

function cleanSetValues(values: SetValues): SetValues {
  const out: SetValues = {};
  if ('weight' in values) out.weight = cleanNumber(values.weight);
  if ('reps' in values) out.reps = cleanNumber(values.reps, true);
  if ('seconds' in values) out.seconds = cleanNumber(values.seconds, true);
  if ('distance' in values) out.distance = cleanNumber(values.distance);
  return out;
}

export function createSet(values: SetValues = {}, id: string = newId()): PlannedSet {
  return { id, ...cleanSetValues(values) };
}

export function createExercise(id: string = newId()): Exercise {
  return { id, name: '', kind: 'weight-reps', notes: '', sets: [createSet()] };
}

export function createWorkout(now: number, id: string = newId()): Workout {
  return { id, name: '', notes: '', exercises: [], createdAt: now, updatedAt: now };
}

/** True for a workout nobody has put anything into yet; such workouts are not worth keeping. */
export function isBlankWorkout(workout: Workout): boolean {
  return workout.name.trim() === '' && workout.notes.trim() === '' && workout.exercises.length === 0;
}

export function displayName(workout: Workout): string {
  return workout.name.trim() || 'Untitled workout';
}

// --- editing one workout ----------------------------------------------------

function withExercises(workout: Workout, exercises: Exercise[], now: number): Workout {
  return { ...workout, exercises, updatedAt: now };
}

function mapExercise(workout: Workout, exerciseId: string, now: number, change: (e: Exercise) => Exercise): Workout {
  if (!workout.exercises.some((e) => e.id === exerciseId)) return workout;
  return withExercises(workout, workout.exercises.map((e) => (e.id === exerciseId ? change(e) : e)), now);
}

export function updateWorkout(workout: Workout, patch: WorkoutPatch, now: number): Workout {
  return { ...workout, ...patch, updatedAt: now };
}

export function addExercise(workout: Workout, now: number, exercise: Exercise = createExercise()): Workout {
  return withExercises(workout, [...workout.exercises, exercise], now);
}

export function updateExercise(workout: Workout, exerciseId: string, patch: ExercisePatch, now: number): Workout {
  return mapExercise(workout, exerciseId, now, (e) => {
    const next = { ...e, ...patch };
    if ('restSeconds' in patch) next.restSeconds = cleanNumber(patch.restSeconds, true);
    return next;
  });
}

export function removeExercise(workout: Workout, exerciseId: string, now: number): Workout {
  if (!workout.exercises.some((e) => e.id === exerciseId)) return workout;
  return withExercises(workout, workout.exercises.filter((e) => e.id !== exerciseId), now);
}

/** Moves an exercise one place up (-1) or down (1). Moving past either end does nothing. */
export function moveExercise(workout: Workout, exerciseId: string, direction: -1 | 1, now: number): Workout {
  const from = workout.exercises.findIndex((e) => e.id === exerciseId);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= workout.exercises.length) return workout;
  const exercises = [...workout.exercises];
  [exercises[from], exercises[to]] = [exercises[to], exercises[from]];
  return withExercises(workout, exercises, now);
}

function copyExercise(exercise: Exercise): Exercise {
  return { ...exercise, id: newId(), sets: exercise.sets.map((s) => ({ ...s, id: newId() })) };
}

/** Inserts a copy directly after the original. */
export function duplicateExercise(workout: Workout, exerciseId: string, now: number): Workout {
  const index = workout.exercises.findIndex((e) => e.id === exerciseId);
  if (index === -1) return workout;
  const exercises = [...workout.exercises];
  exercises.splice(index + 1, 0, copyExercise(workout.exercises[index]));
  return withExercises(workout, exercises, now);
}

/** Adds a set that starts with the previous set's values, since consecutive sets are usually alike. */
export function addSet(workout: Workout, exerciseId: string, now: number): Workout {
  return mapExercise(workout, exerciseId, now, (e) => {
    const last = e.sets[e.sets.length - 1];
    const { id: _id, ...values } = last ?? { id: '' };
    return { ...e, sets: [...e.sets, createSet(values)] };
  });
}

export function updateSet(workout: Workout, exerciseId: string, setId: string, values: SetValues, now: number): Workout {
  return mapExercise(workout, exerciseId, now, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? { ...s, ...cleanSetValues(values) } : s)),
  }));
}

export function removeSet(workout: Workout, exerciseId: string, setId: string, now: number): Workout {
  return mapExercise(workout, exerciseId, now, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }));
}

// --- the collection of workouts --------------------------------------------

/** A full copy with new ids everywhere, so editing the copy never touches the original. */
export function duplicateWorkout(workout: Workout, now: number): Workout {
  return {
    ...workout,
    id: newId(),
    name: `${displayName(workout)} (copy)`,
    exercises: workout.exercises.map(copyExercise),
    createdAt: now,
    updatedAt: now,
  };
}

/** Replaces the workout with the same id, or puts a new one first. */
export function upsertWorkout(workouts: Workout[], workout: Workout): Workout[] {
  return workouts.some((w) => w.id === workout.id)
    ? workouts.map((w) => (w.id === workout.id ? workout : w))
    : [workout, ...workouts];
}

export function removeWorkout(workouts: Workout[], workoutId: string): Workout[] {
  return workouts.filter((w) => w.id !== workoutId);
}

/** Puts a copy directly after the original in the list. */
export function insertAfter(workouts: Workout[], afterId: string, workout: Workout): Workout[] {
  const index = workouts.findIndex((w) => w.id === afterId);
  if (index === -1) return [workout, ...workouts];
  const next = [...workouts];
  next.splice(index + 1, 0, workout);
  return next;
}

export interface WorkoutSummary {
  exercises: number;
  sets: number;
  /** R2 volume over the weight-and-reps exercises, in the user's weight unit. */
  volume: number;
}

export function summarize(workout: Workout): WorkoutSummary {
  const weighted = workout.exercises
    .filter((e) => e.kind === 'weight-reps')
    .flatMap((e) => e.sets.map((s) => ({ exercise: e.name.trim() || 'Exercise', reps: s.reps ?? 0, weight: s.weight ?? 0 })));
  return {
    exercises: workout.exercises.length,
    sets: workout.exercises.reduce((n, e) => n + e.sets.length, 0),
    volume: totalVolume(weighted),
  };
}
