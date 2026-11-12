import { describe, expect, it } from 'vitest';
import {
  loadUnit,
  loadWorkouts,
  parseWorkouts,
  saveUnit,
  saveWorkouts,
  serializeWorkouts,
  UNIT_KEY,
  WORKOUTS_KEY,
  type KeyValueStore,
} from './storage';
import { addExercise, addSet, createExercise, createWorkout, updateExercise, updateSet, updateWorkout } from './workouts';

function fakeStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota exceeded');
  },
};

function fullWorkout() {
  let w = updateWorkout(createWorkout(100, 'w'), { name: 'Push day', notes: 'Warm up first' }, 100);
  w = addExercise(w, 100, createExercise('e1'));
  w = updateExercise(w, 'e1', { name: 'Bench press', restSeconds: 120, notes: 'pause at chest' }, 100);
  w = updateSet(w, 'e1', w.exercises[0].sets[0].id, { weight: 135.5, reps: 8 }, 100);
  w = addSet(w, 'e1', 100);
  w = addExercise(w, 100, createExercise('e2'));
  w = updateExercise(w, 'e2', { name: 'Row machine', kind: 'distance' }, 100);
  w = updateSet(w, 'e2', w.exercises[1].sets[0].id, { distance: 2.5, seconds: 600 }, 200);
  return w;
}

describe('saving and loading', () => {
  it('gives back exactly what was saved', () => {
    const store = fakeStore();
    const workouts = [fullWorkout(), createWorkout(5, 'empty')];
    expect(saveWorkouts(store, workouts)).toBe(true);
    expect(loadWorkouts(store)).toEqual(workouts);
  });

  it('starts empty on a device with nothing saved', () => {
    expect(loadWorkouts(fakeStore())).toEqual([]);
  });

  it('reports a failed save and survives blocked storage', () => {
    expect(saveWorkouts(brokenStore, [fullWorkout()])).toBe(false);
    expect(loadWorkouts(brokenStore)).toEqual([]);
  });

  it('keeps many workouts', () => {
    const store = fakeStore();
    const many = Array.from({ length: 200 }, (_, i) => createWorkout(i, `w${i}`));
    saveWorkouts(store, many);
    expect(loadWorkouts(store)).toHaveLength(200);
  });
});

describe('damaged saved data', () => {
  it('unreadable text gives an empty list instead of an error', () => {
    for (const raw of ['', 'not json', '{', 'null', '42', '"text"', '{"workouts": "nope"}']) {
      expect(parseWorkouts(raw)).toEqual([]);
    }
  });

  it('skips entries that are not workouts and keeps the good ones', () => {
    const raw = JSON.stringify({ version: 1, workouts: [null, 7, 'x', [], fullWorkout()] });
    const loaded = parseWorkouts(raw);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Push day');
  });

  it('repairs missing or wrong fields', () => {
    const raw = JSON.stringify({
      workouts: [
        {
          name: 42,
          exercises: [
            { name: 'Squat', kind: 'made-up', restSeconds: -3, sets: [{ weight: '100', reps: 5.8 }, 'junk', { reps: -1 }] },
            'junk',
          ],
        },
      ],
    });
    const [w] = parseWorkouts(raw);
    expect(w.name).toBe('');
    expect(w.notes).toBe('');
    expect(w.id).not.toBe('');
    expect(w.createdAt).toBe(0);
    expect(w.exercises).toHaveLength(1);
    const [e] = w.exercises;
    expect(e.kind).toBe('weight-reps');
    expect(e.restSeconds).toBeUndefined();
    expect(e.sets).toHaveLength(2);
    expect(e.sets[0].weight).toBeUndefined();
    expect(e.sets[0].reps).toBe(5);
    expect(e.sets[1].reps).toBeUndefined();
    expect(e.sets[0].id).not.toBe(e.sets[1].id);
  });

  it('drops a second workout that reuses an id', () => {
    const w = fullWorkout();
    expect(parseWorkouts(JSON.stringify({ workouts: [w, { ...w, name: 'clone' }] }))).toHaveLength(1);
  });

  it('still reads a bare list from before the format had a version', () => {
    expect(parseWorkouts(JSON.stringify([fullWorkout()]))).toHaveLength(1);
  });

  it('writes a versioned format under the expected key', () => {
    const store = fakeStore();
    saveWorkouts(store, []);
    expect(JSON.parse(store.data[WORKOUTS_KEY])).toEqual({ version: 1, workouts: [] });
    expect(serializeWorkouts([])).toBe(store.data[WORKOUTS_KEY]);
  });
});

describe('weight unit', () => {
  it('defaults to pounds and remembers a change', () => {
    const store = fakeStore();
    expect(loadUnit(store)).toBe('lb');
    expect(saveUnit(store, 'kg')).toBe(true);
    expect(loadUnit(store)).toBe('kg');
  });

  it('falls back to pounds for an unknown value or blocked storage', () => {
    expect(loadUnit(fakeStore({ [UNIT_KEY]: 'stone' }))).toBe('lb');
    expect(loadUnit(brokenStore)).toBe('lb');
    expect(saveUnit(brokenStore, 'kg')).toBe(false);
  });
});
