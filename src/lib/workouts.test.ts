import { describe, expect, it } from 'vitest';
import {
  addExercise,
  addSet,
  cleanNumber,
  createExercise,
  createWorkout,
  displayName,
  duplicateExercise,
  duplicateWorkout,
  insertAfter,
  isBlankWorkout,
  moveExercise,
  removeExercise,
  removeSet,
  removeWorkout,
  summarize,
  updateExercise,
  updateSet,
  updateWorkout,
  upsertWorkout,
  type Workout,
} from './workouts';

/** A workout with exercises named a, b, c (one empty set each), created at time 1. */
function sample(): Workout {
  let w = createWorkout(1, 'w1');
  for (const name of ['a', 'b', 'c']) {
    w = addExercise(w, 1, { ...createExercise(name), name });
  }
  return w;
}
const names = (w: Workout) => w.exercises.map((e) => e.name).join('');

describe('creating', () => {
  it('starts a workout blank and stamps both times', () => {
    const w = createWorkout(42, 'id');
    expect(w).toEqual({ id: 'id', name: '', notes: '', exercises: [], createdAt: 42, updatedAt: 42 });
    expect(isBlankWorkout(w)).toBe(true);
    expect(displayName(w)).toBe('Untitled workout');
  });

  it('starts an exercise with one empty set ready to fill in', () => {
    const e = createExercise('e');
    expect(e.kind).toBe('weight-reps');
    expect(e.sets).toHaveLength(1);
  });

  it('gives every new thing a different id', () => {
    const ids = new Set(Array.from({ length: 50 }, () => createExercise().id));
    expect(ids.size).toBe(50);
  });

  it('is no longer blank once anything is entered', () => {
    const w = createWorkout(1);
    expect(isBlankWorkout(updateWorkout(w, { name: 'Push' }, 2))).toBe(false);
    expect(isBlankWorkout(updateWorkout(w, { notes: 'x' }, 2))).toBe(false);
    expect(isBlankWorkout(addExercise(w, 2))).toBe(false);
    expect(isBlankWorkout(updateWorkout(w, { name: '   ' }, 2))).toBe(true);
  });
});

describe('editing a workout', () => {
  it('renames and records when it changed, without touching the original', () => {
    const before = sample();
    const after = updateWorkout(before, { name: 'Leg day' }, 99);
    expect(after.name).toBe('Leg day');
    expect(after.updatedAt).toBe(99);
    expect(after.createdAt).toBe(1);
    expect(before.name).toBe('');
  });

  it('adds exercises at the end, with no limit', () => {
    let w = createWorkout(1);
    for (let i = 0; i < 40; i++) w = addExercise(w, 2);
    expect(w.exercises).toHaveLength(40);
  });

  it('updates one exercise and leaves the others alone', () => {
    const before = sample();
    const after = updateExercise(before, 'b', { name: 'Bench', kind: 'reps', notes: 'slow', restSeconds: 90 }, 5);
    expect(after.exercises[1]).toMatchObject({ name: 'Bench', kind: 'reps', notes: 'slow', restSeconds: 90 });
    expect(after.exercises[0]).toBe(before.exercises[0]);
    expect(after.updatedAt).toBe(5);
  });

  it('clears rest time when given nothing or nonsense', () => {
    const w = updateExercise(sample(), 'a', { restSeconds: 60 }, 2);
    expect(updateExercise(w, 'a', { restSeconds: undefined }, 3).exercises[0].restSeconds).toBeUndefined();
    expect(updateExercise(w, 'a', { restSeconds: -5 }, 3).exercises[0].restSeconds).toBeUndefined();
  });

  it('removes an exercise', () => {
    expect(names(removeExercise(sample(), 'b', 2))).toBe('ac');
  });

  it('reorders one place at a time and stops at the ends', () => {
    const w = sample();
    expect(names(moveExercise(w, 'c', -1, 2))).toBe('acb');
    expect(names(moveExercise(w, 'a', 1, 2))).toBe('bac');
    expect(moveExercise(w, 'a', -1, 2)).toBe(w);
    expect(moveExercise(w, 'c', 1, 2)).toBe(w);
  });

  it('duplicates an exercise right after the original, with its own ids', () => {
    const before = updateSet(sample(), 'b', sample().exercises[1].sets[0].id, { weight: 50, reps: 5 }, 2);
    const withSet = { ...before, exercises: before.exercises.map((e) => (e.id === 'b' ? { ...e, sets: [{ id: 's', weight: 50, reps: 5 }] } : e)) };
    const after = duplicateExercise(withSet, 'b', 3);
    expect(names(after)).toBe('abbc');
    expect(after.exercises[2].id).not.toBe('b');
    expect(after.exercises[2].sets[0]).toMatchObject({ weight: 50, reps: 5 });
    expect(after.exercises[2].sets[0].id).not.toBe('s');
  });

  it('ignores edits aimed at an exercise that does not exist', () => {
    const w = sample();
    expect(updateExercise(w, 'zzz', { name: 'x' }, 9)).toBe(w);
    expect(removeExercise(w, 'zzz', 9)).toBe(w);
    expect(duplicateExercise(w, 'zzz', 9)).toBe(w);
    expect(addSet(w, 'zzz', 9)).toBe(w);
  });
});

describe('editing sets', () => {
  const firstSetId = (w: Workout) => w.exercises[0].sets[0].id;

  it('stores the values entered', () => {
    const w = sample();
    const after = updateSet(w, 'a', firstSetId(w), { weight: 102.5, reps: 8 }, 2);
    expect(after.exercises[0].sets[0]).toMatchObject({ weight: 102.5, reps: 8 });
  });

  it('keeps reps and seconds whole and drops negative or invalid numbers', () => {
    const w = sample();
    const after = updateSet(w, 'a', firstSetId(w), { weight: -1, reps: 8.9, seconds: Number.NaN, distance: 2.5 }, 2);
    expect(after.exercises[0].sets[0]).toMatchObject({ reps: 8, distance: 2.5 });
    expect(after.exercises[0].sets[0].weight).toBeUndefined();
    expect(after.exercises[0].sets[0].seconds).toBeUndefined();
  });

  it('clearing one field leaves the others', () => {
    let w = sample();
    w = updateSet(w, 'a', firstSetId(w), { weight: 100, reps: 5 }, 2);
    w = updateSet(w, 'a', firstSetId(w), { weight: undefined }, 3);
    expect(w.exercises[0].sets[0].weight).toBeUndefined();
    expect(w.exercises[0].sets[0].reps).toBe(5);
  });

  it('a new set copies the previous one so repeats take one tap', () => {
    let w = sample();
    w = updateSet(w, 'a', firstSetId(w), { weight: 100, reps: 5 }, 2);
    w = addSet(w, 'a', 3);
    const [first, second] = w.exercises[0].sets;
    expect(second).toMatchObject({ weight: 100, reps: 5 });
    expect(second.id).not.toBe(first.id);
  });

  it('adds an empty set when there are none, and removes sets', () => {
    let w = sample();
    w = removeSet(w, 'a', firstSetId(w), 2);
    expect(w.exercises[0].sets).toHaveLength(0);
    w = addSet(w, 'a', 3);
    expect(w.exercises[0].sets).toHaveLength(1);
    expect(w.exercises[0].sets[0].weight).toBeUndefined();
  });

  it('cleanNumber accepts zero and rejects everything unusable', () => {
    expect(cleanNumber(0)).toBe(0);
    expect(cleanNumber(2.7, true)).toBe(2);
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY, '5', null, undefined]) {
      expect(cleanNumber(bad)).toBeUndefined();
    }
  });
});

describe('the list of workouts', () => {
  it('puts a new workout first and replaces an edited one in place', () => {
    const a = createWorkout(1, 'a');
    const b = createWorkout(2, 'b');
    const list = upsertWorkout(upsertWorkout([], a), b);
    expect(list.map((w) => w.id)).toEqual(['b', 'a']);
    const edited = updateWorkout(a, { name: 'Pull' }, 3);
    const after = upsertWorkout(list, edited);
    expect(after.map((w) => w.id)).toEqual(['b', 'a']);
    expect(after[1].name).toBe('Pull');
  });

  it('removes a workout', () => {
    const list = [createWorkout(1, 'a'), createWorkout(1, 'b')];
    expect(removeWorkout(list, 'a').map((w) => w.id)).toEqual(['b']);
  });

  it('duplicates a workout as an independent copy placed after the original', () => {
    const original = updateWorkout(sample(), { name: 'Push' }, 2);
    const copy = duplicateWorkout(original, 10);
    expect(copy.name).toBe('Push (copy)');
    expect(copy.id).not.toBe(original.id);
    expect(copy.createdAt).toBe(10);
    expect(names(copy)).toBe('abc');
    const originalIds = new Set(original.exercises.flatMap((e) => [e.id, ...e.sets.map((s) => s.id)]));
    for (const e of copy.exercises) {
      expect(originalIds.has(e.id)).toBe(false);
      for (const s of e.sets) expect(originalIds.has(s.id)).toBe(false);
    }
    const list = insertAfter([createWorkout(1, 'x'), original, createWorkout(1, 'y')], original.id, copy);
    expect(list.map((w) => w.id)).toEqual(['x', original.id, copy.id, 'y']);
  });

  it('names a copy of an unnamed workout sensibly', () => {
    expect(duplicateWorkout(createWorkout(1), 2).name).toBe('Untitled workout (copy)');
  });
});

describe('summarize', () => {
  it('counts exercises and sets, and totals volume for weighted exercises only', () => {
    let w = sample();
    w = updateSet(w, 'a', w.exercises[0].sets[0].id, { weight: 100, reps: 5 }, 2);
    w = addSet(w, 'a', 2);
    w = updateExercise(w, 'b', { kind: 'time' }, 2);
    w = updateSet(w, 'b', w.exercises[1].sets[0].id, { seconds: 60, weight: 999, reps: 9 }, 2);
    expect(summarize(w)).toEqual({ exercises: 3, sets: 4, volume: 1000 });
  });

  it('is all zeros for an empty workout', () => {
    expect(summarize(createWorkout(1))).toEqual({ exercises: 0, sets: 0, volume: 0 });
  });

  it('counts volume for a weighted exercise that has no name yet', () => {
    let w = addExercise(createWorkout(1), 1, createExercise('e'));
    w = updateSet(w, 'e', w.exercises[0].sets[0].id, { weight: 20, reps: 10 }, 2);
    expect(summarize(w).volume).toBe(200);
  });
});
