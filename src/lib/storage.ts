// Saving and loading on the device. Loading is tolerant: damaged data is
// repaired or skipped, never thrown, so a bad save cannot lock the user out.
import { EQUIPMENT, MUSCLES, type Equipment, type ExerciseDef, type Muscle } from './exercises';
import type { Session } from './sessions';
import { cleanNumber, EXERCISE_KINDS, newId } from './workouts';
import type { Exercise, ExerciseKind, PlannedSet, Workout } from './workouts';

export const WORKOUTS_KEY = 'gym.workouts.v1';
export const UNIT_KEY = 'gym.unit.v1';
export const SESSIONS_KEY = 'gym.sessions.v1';
export const ACTIVE_KEY = 'gym.active.v1';
export const CUSTOM_EXERCISES_KEY = 'gym.exercises.v1';

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
  if (raw.done === true) set.done = true;
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
  if (typeof raw.defId === 'string' && raw.defId !== '') exercise.defId = raw.defId;
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

// --- sessions (R3, R4) -----------------------------------------------------

function parseSession(raw: unknown): Session | null {
  const base = parseWorkout(raw);
  if (!base || !isRecord(raw)) return null;
  const session: Session = { ...base, startedAt: cleanNumber(raw.startedAt) ?? base.createdAt };
  const finishedAt = cleanNumber(raw.finishedAt);
  if (finishedAt !== undefined) session.finishedAt = finishedAt;
  if (typeof raw.routineId === 'string' && raw.routineId !== '') session.routineId = raw.routineId;
  return session;
}

function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(store: KeyValueStore, key: string, value: unknown): boolean {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Finished sessions. Anything unreadable or unfinished is skipped. */
export function loadHistory(store: KeyValueStore): Session[] {
  const data = readJson(store, SESSIONS_KEY);
  const list = isRecord(data) ? data.sessions : null;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  return list
    .map(parseSession)
    .filter((s) => s !== null)
    .filter((s) => s.finishedAt !== undefined)
    .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}

export function saveHistory(store: KeyValueStore, sessions: Session[]): boolean {
  return writeJson(store, SESSIONS_KEY, { version: 1, sessions });
}

/** The workout in progress, if the app was closed during one. */
export function loadActiveSession(store: KeyValueStore): Session | null {
  const data = readJson(store, ACTIVE_KEY);
  const session = isRecord(data) ? parseSession(data.session) : null;
  return session && session.finishedAt === undefined ? session : null;
}

export function saveActiveSession(store: KeyValueStore, session: Session | null): boolean {
  return writeJson(store, ACTIVE_KEY, { version: 1, session });
}

// --- custom exercises (R8) -------------------------------------------------

function parseExerciseDef(raw: unknown): ExerciseDef | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id === '') return null;
  const name = text(raw.name).trim();
  if (name === '') return null;
  return {
    id: raw.id,
    name,
    muscle: (MUSCLES as readonly string[]).includes(text(raw.muscle)) ? (raw.muscle as Muscle) : 'Full body',
    equipment: (EQUIPMENT as readonly string[]).includes(text(raw.equipment)) ? (raw.equipment as Equipment) : 'Other',
    kind: typeof raw.kind === 'string' && kinds.has(raw.kind) ? (raw.kind as ExerciseKind) : 'weight-reps',
    custom: true,
  };
}

export function loadCustomExercises(store: KeyValueStore): ExerciseDef[] {
  const data = readJson(store, CUSTOM_EXERCISES_KEY);
  const list = isRecord(data) ? data.exercises : null;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  return list
    .map(parseExerciseDef)
    .filter((d) => d !== null)
    .filter((d) => (seen.has(d.id) ? false : (seen.add(d.id), true)));
}

export function saveCustomExercises(store: KeyValueStore, exercises: ExerciseDef[]): boolean {
  return writeJson(store, CUSTOM_EXERCISES_KEY, { version: 1, exercises });
}
