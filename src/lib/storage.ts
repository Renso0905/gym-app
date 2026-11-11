// Saving and loading on the device. Loading is tolerant: damaged data is
// repaired or skipped, never thrown, so a bad save cannot lock the user out.
import { cleanNumber, EXERCISE_KINDS, newId } from './workouts';
import type { Exercise, ExerciseKind, PlannedSet, Workout } from './workouts';

export const WORKOUTS_KEY = 'gym.workouts.v1';
export const UNIT_KEY = 'gym.unit.v1';

export type WeightUnit = 'lb' | 'kg';

/** The part of the browser's localStorage this module needs; tests pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const id = (v: unknown): string => (typeof v === 'string' && v !== '' ? v : newId());
const kinds = new Set<string>(EXERCISE_KINDS.map((k) => k.kind));

function parseSet(raw: unknown): PlannedSet | null {
  if (!isRecord(raw)) return null;
  const set: PlannedSet = { id: id(raw.id) };
  const weight = cleanNumber(raw.weight);
  const reps = cleanNumber(raw.reps, true);
  const seconds = cleanNumber(raw.seconds, true);
  const distance = cleanNumber(raw.distance);
  if (weight !== undefined) set.weight = weight;
  if (reps !== undefined) set.reps = reps;
  if (seconds !== undefined) set.seconds = seconds;
  if (distance !== undefined) set.distance = distance;
  return set;
}

function parseExercise(raw: unknown): Exercise | null {
  if (!isRecord(raw)) return null;
  const exercise: Exercise = {
    id: id(raw.id),
    name: text(raw.name),
    kind: typeof raw.kind === 'string' && kinds.has(raw.kind) ? (raw.kind as ExerciseKind) : 'weight-reps',
    notes: text(raw.notes),
    sets: Array.isArray(raw.sets) ? raw.sets.map(parseSet).filter((s) => s !== null) : [],
  };
  const rest = cleanNumber(raw.restSeconds, true);
  if (rest !== undefined) exercise.restSeconds = rest;
  return exercise;
}

function parseWorkout(raw: unknown): Workout | null {
  if (!isRecord(raw)) return null;
  const createdAt = cleanNumber(raw.createdAt) ?? 0;
  return {
    id: id(raw.id),
    name: text(raw.name),
    notes: text(raw.notes),
    exercises: Array.isArray(raw.exercises) ? raw.exercises.map(parseExercise).filter((e) => e !== null) : [],
    createdAt,
    updatedAt: cleanNumber(raw.updatedAt) ?? createdAt,
  };
}

/** Turns saved text back into workouts. Unreadable input gives an empty list. */
export function parseWorkouts(raw: string | null): Workout[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const list = isRecord(data) ? data.workouts : data;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  return list
    .map(parseWorkout)
    .filter((w) => w !== null)
    .filter((w) => (seen.has(w.id) ? false : (seen.add(w.id), true)));
}

export function serializeWorkouts(workouts: Workout[]): string {
  return JSON.stringify({ version: 1, workouts });
}

export function loadWorkouts(store: KeyValueStore): Workout[] {
  try {
    return parseWorkouts(store.getItem(WORKOUTS_KEY));
  } catch {
    return [];
  }
}

/** Returns false when the device refused the save (storage full or blocked). */
export function saveWorkouts(store: KeyValueStore, workouts: Workout[]): boolean {
  try {
    store.setItem(WORKOUTS_KEY, serializeWorkouts(workouts));
    return true;
  } catch {
    return false;
  }
}

export function loadUnit(store: KeyValueStore): WeightUnit {
  try {
    return store.getItem(UNIT_KEY) === 'kg' ? 'kg' : 'lb';
  } catch {
    return 'lb';
  }
}

export function saveUnit(store: KeyValueStore, unit: WeightUnit): boolean {
  try {
    store.setItem(UNIT_KEY, unit);
    return true;
  } catch {
    return false;
  }
}
