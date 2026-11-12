import { describe, expect, it } from 'vitest';
import { applySessionToRoutine, doneSetCount, finishSession, routineChanges, startSession, toggleSetDone, type Session } from './sessions';
import {
  addExercises,
  addSet,
  createWorkout,
  exerciseFromDef,
  moveExercise,
  replaceExercise,
  updateSet,
  updateWorkout,
  type Workout,
} from './workouts';

const BENCH = { id: 'bench-press-barbell', name: 'Bench Press (Barbell)', kind: 'weight-reps' } as const;
const PLANK = { id: 'plank', name: 'Plank', kind: 'time' } as const;
const ROW = { id: 'dumbbell-row', name: 'Dumbbell Row', kind: 'weight-reps' } as const;

/** A routine: bench with two target sets of 135 x 8, and one empty plank set. */
function routine(): Workout {
  let w = updateWorkout(createWorkout(1, 'r1'), { name: 'Push day' }, 1);
  w = addExercises(w, [exerciseFromDef(BENCH, 'e-bench'), exerciseFromDef(PLANK, 'e-plank')], 1);
  w = updateSet(w, 'e-bench', w.exercises[0].sets[0].id, { weight: 135, reps: 8 }, 1);
  return addSet(w, 'e-bench', 1);
}

/** Runs the routine, lets the test change the session, ticks the sets `tick` allows, and finishes. */
function run(change: (s: Session) => Session = (s) => s, tick: (exercise: string, index: number) => boolean = () => true): Session {
  let s = change(startSession(routine(), 1000));
  for (const e of s.exercises) {
    e.sets.forEach((set, i) => {
      if (tick(e.name, i)) s = toggleSetDone(s, e.id, set.id, { seconds: 30, weight: 50, reps: 5 }, 2000);
    });
  }
  return finishSession(s, 3000)!;
}

describe('replacing an exercise', () => {
  it('keeps the position, set count and numbers when measured the same way', () => {
    const r = replaceExercise(routine(), 'e-bench', ROW, 9);
    expect(r.exercises.map((e) => e.name)).toEqual(['Dumbbell Row', 'Plank']);
    expect(r.exercises[0]).toMatchObject({ id: 'e-bench', defId: 'dumbbell-row', kind: 'weight-reps' });
    expect(r.exercises[0].sets).toHaveLength(2);
    expect(r.exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8 });
    expect(r.updatedAt).toBe(9);
  });

  it('clears the numbers when the new exercise is measured differently', () => {
    const r = replaceExercise(routine(), 'e-bench', PLANK, 9);
    expect(r.exercises[0].kind).toBe('time');
    expect(r.exercises[0].sets).toHaveLength(2);
    expect(r.exercises[0].sets[0].weight).toBeUndefined();
    expect(r.exercises[0].sets[0].reps).toBeUndefined();
  });

  it('clears ticks in a session, since the new exercise has not been done', () => {
    let s = startSession(routine(), 1);
    s = toggleSetDone(s, s.exercises[0].id, s.exercises[0].sets[0].id, undefined, 2);
    s = replaceExercise(s, s.exercises[0].id, ROW, 3);
    expect(doneSetCount(s)).toBe(0);
    expect(s.exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8 });
  });

  it('does nothing for an exercise that is not there', () => {
    const r = routine();
    expect(replaceExercise(r, 'nope', ROW, 9)).toBe(r);
  });
});

describe('comparing a finished session with its routine', () => {
  it('reports nothing when the workout went exactly to plan', () => {
    expect(routineChanges(routine(), run())).toEqual([]);
  });

  it('does not treat different weights or reps as a change to the routine', () => {
    const finished = run((s) => updateSet(s, s.exercises[0].id, s.exercises[0].sets[0].id, { weight: 150, reps: 6 }, 1500));
    expect(routineChanges(routine(), finished)).toEqual([]);
  });

  it('reports planned sets that were left unticked', () => {
    const finished = run(undefined, (name, i) => !(name === BENCH.name && i === 1));
    expect(routineChanges(routine(), finished)).toEqual(['Bench Press (Barbell): 2 sets planned, 1 done']);
  });

  it('reports an exercise that was skipped entirely', () => {
    const finished = run(undefined, (name) => name !== 'Plank');
    expect(routineChanges(routine(), finished)).toEqual(['Skipped Plank']);
  });

  it('reports added sets and added exercises', () => {
    const finished = run((s) => addExercises(addSet(s, s.exercises[0].id, 1500), [exerciseFromDef(ROW)], 1500));
    expect(routineChanges(routine(), finished)).toEqual(['Bench Press (Barbell): 2 sets planned, 3 done', 'Added Dumbbell Row']);
  });

  it('reports a replacement as one skipped and one added', () => {
    const finished = run((s) => replaceExercise(s, s.exercises[1].id, ROW, 1500));
    expect(routineChanges(routine(), finished)).toEqual(['Skipped Plank', 'Added Dumbbell Row']);
  });

  it('reports a changed order', () => {
    const finished = run((s) => moveExercise(s, s.exercises[1].id, -1, 1500));
    expect(routineChanges(routine(), finished)).toEqual(['Exercises done in a different order']);
  });
});

describe('updating the routine from a session', () => {
  it('makes the routine match what was done, and keeps its identity', () => {
    const r = updateWorkout(routine(), { notes: 'Mondays' }, 1);
    const finished = run(
      (s) => updateSet(addExercises(s, [exerciseFromDef(ROW)], 1500), s.exercises[0].id, s.exercises[0].sets[0].id, { weight: 150 }, 1500),
      (name) => name !== 'Plank',
    );
    const updated = applySessionToRoutine(r, finished, 5000);
    expect(updated).toMatchObject({ id: 'r1', name: 'Push day', notes: 'Mondays', createdAt: 1, updatedAt: 5000 });
    expect(updated.exercises.map((e) => e.name)).toEqual(['Bench Press (Barbell)', 'Dumbbell Row']);
    expect(updated.exercises[0].sets[0]).toMatchObject({ weight: 150, reps: 8 });
    expect(updated.exercises.flatMap((e) => e.sets).some((set) => set.done)).toBe(false);
    expect(routineChanges(updated, finished)).toEqual([]);
  });

  it('gives the routine its own copies, not the session’s', () => {
    const finished = run();
    const updated = applySessionToRoutine(routine(), finished, 5000);
    const sessionIds = new Set(finished.exercises.flatMap((e) => [e.id, ...e.sets.map((x) => x.id)]));
    for (const e of updated.exercises) {
      expect(sessionIds.has(e.id)).toBe(false);
      for (const set of e.sets) expect(sessionIds.has(set.id)).toBe(false);
    }
  });
});
