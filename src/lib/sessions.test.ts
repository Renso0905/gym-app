import { describe, expect, it } from 'vitest';
import {
  doneSetCount,
  durationMinutes,
  finishSession,
  formatElapsed,
  previousSets,
  sortHistory,
  startSession,
  toggleSetDone,
  type Session,
} from './sessions';
import {
  loadActiveSession,
  loadCustomExercises,
  loadHistory,
  saveActiveSession,
  saveCustomExercises,
  saveHistory,
  type KeyValueStore,
} from './storage';
import {
  addExercises,
  addSet,
  createWorkout,
  exerciseFromDef,
  exerciseKey,
  formatSet,
  summarize,
  updateSet,
  updateWorkout,
  type Workout,
} from './workouts';

const BENCH = { id: 'bench-press-barbell', name: 'Bench Press (Barbell)', kind: 'weight-reps' } as const;
const PLANK = { id: 'plank', name: 'Plank', kind: 'time' } as const;

/** A routine: bench with two target sets of 135 x 8, and one empty plank set. */
function routine(): Workout {
  let w = updateWorkout(createWorkout(1, 'r1'), { name: 'Push day' }, 1);
  w = addExercises(w, [exerciseFromDef(BENCH, 'e-bench'), exerciseFromDef(PLANK, 'e-plank')], 1);
  w = updateSet(w, 'e-bench', w.exercises[0].sets[0].id, { weight: 135, reps: 8 }, 1);
  return addSet(w, 'e-bench', 1);
}

/** Ticks every set of the session. */
function doAll(session: Session, now: number): Session {
  let s = session;
  for (const e of session.exercises) for (const set of e.sets) s = toggleSetDone(s, e.id, set.id, undefined, now);
  return s;
}

function fakeStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => void (data[k] = v) };
}

describe('starting a session', () => {
  it('copies the routine outline with its target numbers, nothing ticked', () => {
    const r = routine();
    const s = startSession(r, 1000, 's1');
    expect(s).toMatchObject({ id: 's1', routineId: 'r1', name: 'Push day', startedAt: 1000 });
    expect(s.finishedAt).toBeUndefined();
    expect(s.exercises.map((e) => e.name)).toEqual(['Bench Press (Barbell)', 'Plank']);
    expect(s.exercises[0].defId).toBe('bench-press-barbell');
    expect(s.exercises[0].sets).toHaveLength(2);
    expect(s.exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8 });
    expect(doneSetCount(s)).toBe(0);
  });

  it('is independent of the routine it came from', () => {
    const r = routine();
    const s = startSession(r, 1000);
    const routineIds = new Set(r.exercises.flatMap((e) => [e.id, ...e.sets.map((x) => x.id)]));
    for (const e of s.exercises) {
      expect(routineIds.has(e.id)).toBe(false);
      for (const set of e.sets) expect(routineIds.has(set.id)).toBe(false);
    }
    const edited = updateSet(s, s.exercises[0].id, s.exercises[0].sets[0].id, { weight: 200 }, 2000);
    expect(edited.exercises[0].sets[0].weight).toBe(200);
    expect(r.exercises[0].sets[0].weight).toBe(135);
  });

  it('can start empty, with no routine', () => {
    const s = startSession(null, 5);
    expect(s.routineId).toBeUndefined();
    expect(s.name).toBe('Workout');
    expect(s.exercises).toEqual([]);
  });
});

describe('ticking sets', () => {
  it('ticks and unticks a set, keeping its numbers', () => {
    const s = startSession(routine(), 1);
    const [bench] = s.exercises;
    const ticked = toggleSetDone(s, bench.id, bench.sets[0].id, undefined, 2);
    expect(ticked.exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8, done: true });
    expect(doneSetCount(ticked)).toBe(1);
    const unticked = toggleSetDone(ticked, bench.id, bench.sets[0].id, undefined, 3);
    expect(unticked.exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8, done: false });
  });

  it('fills an empty set from last time when ticked', () => {
    const s = startSession(routine(), 1);
    const plank = s.exercises[1];
    const ticked = toggleSetDone(s, plank.id, plank.sets[0].id, { seconds: 60, weight: 999 }, 2);
    expect(ticked.exercises[1].sets[0]).toMatchObject({ seconds: 60, done: true });
    expect(ticked.exercises[1].sets[0].weight).toBeUndefined();
  });

  it('never overwrites numbers the lifter already entered', () => {
    const s = startSession(routine(), 1);
    const [bench] = s.exercises;
    const ticked = toggleSetDone(s, bench.id, bench.sets[0].id, { weight: 100, reps: 5 }, 2);
    expect(ticked.exercises[0].sets[0]).toMatchObject({ weight: 135, reps: 8 });
  });

  it('a set added during the session copies the numbers but not the tick', () => {
    let s = startSession(routine(), 1);
    const [bench] = s.exercises;
    s = toggleSetDone(s, bench.id, bench.sets[1].id, undefined, 2);
    s = addSet(s, bench.id, 3);
    expect(s.exercises[0].sets[2]).toMatchObject({ weight: 135, reps: 8 });
    expect(s.exercises[0].sets[2].done).toBeUndefined();
  });

  it('ignores a set or exercise that does not exist', () => {
    const s = startSession(routine(), 1);
    expect(toggleSetDone(s, 'nope', 'nope', undefined, 2)).toBe(s);
    expect(toggleSetDone(s, s.exercises[0].id, 'nope', undefined, 2)).toBe(s);
  });
});

describe('finishing a session', () => {
  it('keeps only the sets that were done and stamps the finish time', () => {
    let s = startSession(routine(), 1000);
    const [bench] = s.exercises;
    s = toggleSetDone(s, bench.id, bench.sets[0].id, undefined, 2000);
    const finished = finishSession(s, 61_000)!;
    expect(finished.finishedAt).toBe(61_000);
    expect(finished.exercises).toHaveLength(1);
    expect(finished.exercises[0].sets).toHaveLength(1);
    expect(summarize(finished)).toEqual({ exercises: 1, sets: 1, volume: 1080 });
    expect(durationMinutes(finished, 0)).toBe(1);
  });

  it('logs nothing when no set was done', () => {
    expect(finishSession(startSession(routine(), 1), 2)).toBeNull();
    expect(finishSession(startSession(null, 1), 2)).toBeNull();
  });
});

describe('what was done last time', () => {
  const log = (weight: number, startedAt: number) => {
    let s = startSession(routine(), startedAt);
    s = updateSet(s, s.exercises[0].id, s.exercises[0].sets[0].id, { weight }, startedAt);
    return finishSession(doAll(s, startedAt + 1), startedAt + 10)!;
  };

  it('comes from the most recent session containing the exercise, whatever the order stored', () => {
    const history = [log(140, 5000), log(150, 9000), log(130, 1000)];
    expect(previousSets(history, BENCH_REF)[0].weight).toBe(150);
    expect(sortHistory(history).map((h) => h.startedAt)).toEqual([9000, 5000, 1000]);
  });

  it('matches the same exercise in a different routine or an empty workout', () => {
    const other = { defId: 'bench-press-barbell', name: 'Renamed later' };
    expect(previousSets([log(140, 5000)], other)).toHaveLength(2);
  });

  it('falls back to the name for exercises saved before the library existed', () => {
    expect(exerciseKey({ name: '  Bench  ' })).toBe('name:bench');
    expect(exerciseKey({ defId: 'x', name: 'Bench' })).toBe('x');
  });

  it('is empty for an exercise never logged', () => {
    expect(previousSets([log(140, 5000)], { defId: 'pull-up', name: 'Pull-Up' })).toEqual([]);
    expect(previousSets([], BENCH_REF)).toEqual([]);
  });

  const BENCH_REF = { defId: BENCH.id, name: BENCH.name };
});

describe('formatting', () => {
  it('shows a set the way a lifter would write it', () => {
    expect(formatSet('weight-reps', { weight: 135, reps: 8 })).toBe('135 × 8');
    expect(formatSet('weight-reps', { reps: 8 })).toBe('8 reps');
    expect(formatSet('reps', { reps: 12 })).toBe('12 reps');
    expect(formatSet('time', { seconds: 60 })).toBe('60s');
    expect(formatSet('distance', { distance: 2.5, seconds: 900 })).toBe('2.5 in 900s');
    expect(formatSet('weight-reps', {})).toBe('');
  });

  it('shows elapsed time as a clock', () => {
    expect(formatElapsed(0)).toBe('0:00');
    expect(formatElapsed(65_000)).toBe('1:05');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
    expect(formatElapsed(-5)).toBe('0:00');
  });
});

describe('saving sessions and custom exercises', () => {
  it('keeps finished sessions, including ticks, routine link and times', () => {
    const store = fakeStore();
    const finished = finishSession(doAll(startSession(routine(), 1000), 2000), 3000)!;
    expect(saveHistory(store, [finished])).toBe(true);
    expect(loadHistory(store)).toEqual([finished]);
  });

  it('never loads an unfinished or unreadable session into the history', () => {
    const store = fakeStore();
    saveHistory(store, [startSession(routine(), 1000)]);
    expect(loadHistory(store)).toEqual([]);
    store.data['gym.sessions.v1'] = '{broken';
    expect(loadHistory(store)).toEqual([]);
    store.data['gym.sessions.v1'] = JSON.stringify({ sessions: [null, 3, 'x'] });
    expect(loadHistory(store)).toEqual([]);
  });

  it('restores a workout in progress, and nothing once it is cleared', () => {
    const store = fakeStore();
    expect(loadActiveSession(store)).toBeNull();
    let s = startSession(routine(), 1000);
    s = toggleSetDone(s, s.exercises[0].id, s.exercises[0].sets[0].id, undefined, 2000);
    saveActiveSession(store, s);
    expect(loadActiveSession(store)).toEqual(s);
    saveActiveSession(store, null);
    expect(loadActiveSession(store)).toBeNull();
  });

  it('keeps custom exercises and repairs or drops damaged ones', () => {
    const store = fakeStore();
    expect(loadCustomExercises(store)).toEqual([]);
    const mine = { id: 'c1', name: 'Cable Y-Raise', muscle: 'Shoulders', equipment: 'Cable', kind: 'weight-reps', custom: true } as const;
    saveCustomExercises(store, [mine]);
    expect(loadCustomExercises(store)).toEqual([mine]);
    store.data['gym.exercises.v1'] = JSON.stringify({
      exercises: [mine, mine, { id: 'c2', name: 'Odd', muscle: 'Elbow', equipment: 'Rock', kind: 'vibes' }, { name: 'no id' }, { id: 'c3', name: ' ' }],
    });
    const loaded = loadCustomExercises(store);
    expect(loaded.map((d) => d.id)).toEqual(['c1', 'c2']);
    expect(loaded[1]).toMatchObject({ muscle: 'Full body', equipment: 'Other', kind: 'weight-reps', custom: true });
  });
});
