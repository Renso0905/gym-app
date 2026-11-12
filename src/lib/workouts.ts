// Routines (R7) and the editing rules they share with logged sessions (R3).
// A routine is the outline of a workout: exercises and planned sets. A session
// (see sessions.ts) has the same shape plus dates and ticked-off sets, so the
// editing functions here work on both. Every function returns a new value.
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
  /** Only meaningful in a session: the set has been performed. */
  done?: boolean;
}

export interface Exercise {
  id: string;
  /** The library exercise this came from; absent for exercises saved before the library existed. */
  defId?: string;
  name: string;
  kind: ExerciseKind;
  notes: string;
  restSeconds?: number;
  sets: PlannedSet[];
}

/** Anything that holds an ordered list of exercises: a routine or a session. */
export interface Plan {
  exercises: Exercise[];
  updatedAt: number;
}

export interface Workout extends Plan {
  id: string;
  name: string;
  notes: string;
  createdAt: number;
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

/** An exercise picked from the library, starting with one empty set. */
export function exerciseFromDef(def: { id: string; name: string; kind: ExerciseKind }, id: string = newId()): Exercise {
  return { id, defId: def.id, name: def.name, kind: def.kind, notes: '', sets: [createSet()] };
}

/** Identifies "the same exercise" across routines and sessions, for looking up past performance. */
export function exerciseKey(exercise: Pick<Exercise, 'defId' | 'name'>): string {
  return exercise.defId ?? `name:${exercise.name.trim().toLowerCase()}`;
}

export function createWorkout(now: number, id: string = newId()): Workout {
  return { id, name: '', notes: '', exercises: [], createdAt: now, updatedAt: now };
}

/** True for a workout nobody has put anything into yet; such workouts are not worth keeping. */
export function isBlankWorkout(workout: Workout): boolean {
  return workout.name.trim() === '' && workout.notes.trim() === '' && workout.exercises.length === 0;
}

export function displayName(workout: Pick<Workout, 'name'>, fallback = 'Untitled routine'): string {
  return workout.name.trim() || fallback;
}

/** A set's numbers as short text, e.g. "135 × 8", or "" when nothing is filled in. */
export function formatSet(kind: ExerciseKind, set: SetValues): string {
  const has = (v: number | undefined): v is number => v !== undefined;
  switch (kind) {
    case 'weight-reps':
      if (has(set.weight) && has(set.reps)) return `${set.weight} × ${set.reps}`;
      return has(set.reps) ? `${set.reps} reps` : has(set.weight) ? `${set.weight}` : '';
    case 'reps':
      return has(set.reps) ? `${set.reps} reps` : '';
    case 'time':
      return has(set.seconds) ? `${set.seconds}s` : '';
    case 'distance':
      return [has(set.distance) ? `${set.distance}` : '', has(set.seconds) ? `${set.seconds}s` : ''].filter(Boolean).join(' in ');
  }
}

// --- editing a routine or session ------------------------------------------

function withExercises<T extends Plan>(plan: T, exercises: Exercise[], now: number): T {
  return { ...plan, exercises, updatedAt: now };
}

function mapExercise<T extends Plan>(plan: T, exerciseId: string, now: number, change: (e: Exercise) => Exercise): T {
  if (!plan.exercises.some((e) => e.id === exerciseId)) return plan;
  return withExercises(plan, plan.exercises.map((e) => (e.id === exerciseId ? change(e) : e)), now);
}

export function updateWorkout<T extends Workout>(workout: T, patch: WorkoutPatch, now: number): T {
  return { ...workout, ...patch, updatedAt: now };
}

export function addExercise<T extends Plan>(plan: T, now: number, exercise: Exercise = createExercise()): T {
  return withExercises(plan, [...plan.exercises, exercise], now);
}

/** Adds several exercises at once, in the order given. */
export function addExercises<T extends Plan>(plan: T, exercises: Exercise[], now: number): T {
  if (exercises.length === 0) return plan;
  return withExercises(plan, [...plan.exercises, ...exercises], now);
}

export function updateExercise<T extends Plan>(plan: T, exerciseId: string, patch: ExercisePatch, now: number): T {
  return mapExercise(plan, exerciseId, now, (e) => {
    const next = { ...e, ...patch };
    if ('restSeconds' in patch) next.restSeconds = cleanNumber(patch.restSeconds, true);
    return next;
  });
}

export function removeExercise<T extends Plan>(plan: T, exerciseId: string, now: number): T {
  if (!plan.exercises.some((e) => e.id === exerciseId)) return plan;
  return withExercises(plan, plan.exercises.filter((e) => e.id !== exerciseId), now);
}

/**
 * Swaps an exercise for another from the library, in the same position with
 * the same number of sets. Numbers are kept when both are measured the same
 * way and cleared otherwise; ticks are always cleared, because the new
 * exercise has not been performed.
 */
export function replaceExercise<T extends Plan>(
  plan: T,
  exerciseId: string,
  def: { id: string; name: string; kind: ExerciseKind },
  now: number,
): T {
  return mapExercise(plan, exerciseId, now, (e) => ({
    ...e,
    defId: def.id,
    name: def.name,
    kind: def.kind,
    sets: e.sets.map(({ done: _done, ...set }) => (e.kind === def.kind ? set : { id: set.id })),
  }));
}

/** Moves an exercise one place up (-1) or down (1). Moving past either end does nothing. */
export function moveExercise<T extends Plan>(plan: T, exerciseId: string, direction: -1 | 1, now: number): T {
  const from = plan.exercises.findIndex((e) => e.id === exerciseId);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= plan.exercises.length) return plan;
  const exercises = [...plan.exercises];
  [exercises[from], exercises[to]] = [exercises[to], exercises[from]];
  return withExercises(plan, exercises, now);
}

/** A copy with new ids. Ticks are cleared: a copy has not been performed. */
export function copyExercise(exercise: Exercise): Exercise {
  return {
    ...exercise,
    id: newId(),
    sets: exercise.sets.map(({ done: _done, ...set }) => ({ ...set, id: newId() })),
  };
}

/** Inserts a copy directly after the original. */
export function duplicateExercise<T extends Plan>(plan: T, exerciseId: string, now: number): T {
  const index = plan.exercises.findIndex((e) => e.id === exerciseId);
  if (index === -1) return plan;
  const exercises = [...plan.exercises];
  exercises.splice(index + 1, 0, copyExercise(plan.exercises[index]));
  return withExercises(plan, exercises, now);
}

/** Adds a set that starts with the previous set's values, since consecutive sets are usually alike. */
export function addSet<T extends Plan>(plan: T, exerciseId: string, now: number): T {
  return mapExercise(plan, exerciseId, now, (e) => {
    const last = e.sets[e.sets.length - 1];
    const { id: _id, done: _done, ...values } = last ?? { id: '' };
    return { ...e, sets: [...e.sets, createSet(values)] };
  });
}

export function updateSet<T extends Plan>(plan: T, exerciseId: string, setId: string, values: SetValues, now: number): T {
  return mapExercise(plan, exerciseId, now, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? { ...s, ...cleanSetValues(values) } : s)),
  }));
}

export function removeSet<T extends Plan>(plan: T, exerciseId: string, setId: string, now: number): T {
  return mapExercise(plan, exerciseId, now, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }));
}

// --- the collection of routines --------------------------------------------

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

/** Replaces the item with the same id, or puts a new one first. */
export function upsertWorkout<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((w) => w.id === item.id) ? items.map((w) => (w.id === item.id ? item : w)) : [item, ...items];
}

export function removeWorkout<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((w) => w.id !== id);
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

export function summarize(plan: Plan): WorkoutSummary {
  const weighted = plan.exercises
    .filter((e) => e.kind === 'weight-reps')
    .flatMap((e) => e.sets.map((s) => ({ exercise: e.name.trim() || 'Exercise', reps: s.reps ?? 0, weight: s.weight ?? 0 })));
  return {
    exercises: plan.exercises.length,
    sets: plan.exercises.reduce((n, e) => n + e.sets.length, 0),
    volume: totalVolume(weighted),
  };
}
