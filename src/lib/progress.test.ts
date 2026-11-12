import { describe, expect, it } from 'vitest';
import type { ExerciseDef } from './exercises';
import {
  estimateOneRepMax,
  exerciseProgress,
  exercisesLogged,
  formatAmount,
  formatMeasure,
  formatMinutes,
  formatSeconds,
  overview,
  sessionsInPeriod,
  setsByMuscle,
  weeklyStreaks,
  weeklyTotals,
  weekStart,
} from './progress';
import type { Session } from './sessions';
import type { Exercise, ExerciseKind, SetValues } from './workouts';

// Local-time dates, so the tests give the same answer in any time zone.
// November 2026: the 2nd, 9th and 16th are Mondays.
const at = (month: number, day: number, hour = 18) => new Date(2026, month - 1, day, hour).getTime();
const NOW = at(11, 11);

let nextId = 0;
function exercise(defId: string, name: string, kind: ExerciseKind, sets: SetValues[]): Exercise {
  return { id: `e${nextId++}`, defId, name, kind, notes: '', sets: sets.map((s) => ({ id: `s${nextId++}`, ...s, done: true })) };
}
const bench = (...sets: Array<[number, number]>) =>
  exercise('bench', 'Bench Press', 'weight-reps', sets.map(([weight, reps]) => ({ weight, reps })));
const pullUp = (...reps: number[]) => exercise('pull-up', 'Pull-Up', 'reps', reps.map((r) => ({ reps: r })));
const plank = (...seconds: number[]) => exercise('plank', 'Plank', 'time', seconds.map((s) => ({ seconds: s })));
const run = (...sets: Array<[number, number]>) =>
  exercise('run', 'Running', 'distance', sets.map(([distance, seconds]) => ({ distance, seconds })));

/** A finished session ending at `finishedAt` after `minutes`. */
function session(finishedAt: number, exercises: Exercise[], minutes = 60): Session {
  const startedAt = finishedAt - minutes * 60000;
  return { id: `w${nextId++}`, name: 'Workout', notes: '', exercises, createdAt: startedAt, updatedAt: finishedAt, startedAt, finishedAt };
}

describe('weeks and periods', () => {
  it('starts the week at midnight on Monday', () => {
    expect(weekStart(at(11, 11))).toBe(new Date(2026, 10, 9).getTime());
    expect(weekStart(at(11, 15, 23))).toBe(new Date(2026, 10, 9).getTime()); // Sunday night
    expect(weekStart(new Date(2026, 10, 9).getTime())).toBe(new Date(2026, 10, 9).getTime());
  });

  it('keeps sessions from today back to the length of the period', () => {
    const history = [session(at(11, 11), [bench([100, 5])]), session(at(10, 15, 1), [bench([100, 5])]), session(at(10, 14, 23), [bench([100, 5])])];
    // 28 days ending 11 Nov start on 15 Oct.
    expect(sessionsInPeriod(history, '4w', NOW)).toHaveLength(2);
    expect(sessionsInPeriod(history, '3m', NOW)).toHaveLength(3);
    expect(sessionsInPeriod(history, 'all', NOW)).toHaveLength(3);
  });
});

describe('overview', () => {
  const history = [
    session(at(11, 10), [bench([100, 5], [100, 5]), pullUp(8), plank(60)], 50),
    session(at(11, 3), [bench([110, 3])], 30),
    session(at(6, 1), [bench([200, 1])], 90),
  ];

  it('adds up workouts, time, sets, reps and volume for the period', () => {
    expect(overview(history, '4w', NOW)).toMatchObject({
      workouts: 2,
      minutes: 80,
      averageMinutes: 40,
      sets: 5,
      reps: 21, // 5 + 5 + 8 + 3; the plank has no reps
      volume: 1330, // 100x5 + 100x5 + 110x3
    });
    expect(overview(history, 'all', NOW)).toMatchObject({ workouts: 3, minutes: 170, volume: 1530 });
  });

  it('averages workouts per week over the period', () => {
    expect(overview(history, '4w', NOW).perWeek).toBe(0.5);
  });

  it('measures the weekly average from the first workout when that is more recent than the period', () => {
    const recent = [session(at(11, 10), [bench([100, 5])]), session(at(11, 3), [bench([100, 5])])];
    // Two weeks of history: 2 workouts in 2 weeks, not 2 in 52.
    expect(overview(recent, '1y', NOW).perWeek).toBe(1);
    expect(overview(recent, 'all', NOW).perWeek).toBe(1);
  });

  it('is all zeros with no workouts', () => {
    expect(overview([], 'all', NOW)).toEqual({ workouts: 0, minutes: 0, averageMinutes: 0, sets: 0, reps: 0, volume: 0, perWeek: 0 });
  });

  it('counts a set without numbers as a set but not in volume or reps', () => {
    const blank = exercise('bench', 'Bench Press', 'weight-reps', [{}]);
    expect(overview([session(at(11, 10), [blank])], 'all', NOW)).toMatchObject({ sets: 1, reps: 0, volume: 0 });
  });
});

describe('weekly streaks', () => {
  const one = [bench([100, 5])];

  it('counts consecutive weeks ending this week', () => {
    const history = [session(at(11, 10), one), session(at(11, 5), one), session(at(11, 2), one), session(at(10, 28), one)];
    expect(weeklyStreaks(history, NOW)).toEqual({ current: 3, longest: 3 });
  });

  it('keeps the streak alive when this week has no workout yet', () => {
    const history = [session(at(11, 5), one), session(at(10, 28), one)];
    expect(weeklyStreaks(history, NOW)).toEqual({ current: 2, longest: 2 });
  });

  it('ends the streak after a whole week off, and remembers the longest', () => {
    const history = [session(at(11, 10), one), session(at(10, 21), one), session(at(10, 14), one), session(at(10, 7), one)];
    expect(weeklyStreaks(history, NOW)).toEqual({ current: 1, longest: 3 });
    expect(weeklyStreaks([session(at(10, 21), one)], NOW)).toEqual({ current: 0, longest: 1 });
  });

  it('is zero with no workouts', () => {
    expect(weeklyStreaks([], NOW)).toEqual({ current: 0, longest: 0 });
  });
});

describe('weekly totals', () => {
  it('gives one entry per week, oldest first, ending with this week', () => {
    const history = [
      session(at(11, 10), [bench([100, 5])]),
      session(at(11, 9), [bench([100, 5], [100, 5])]),
      session(at(11, 3), [pullUp(10)]),
      session(at(6, 1), [bench([500, 1])]), // older than the range
    ];
    const weeks = weeklyTotals(history, NOW, 3);
    expect(weeks.map((w) => w.start)).toEqual([new Date(2026, 9, 26).getTime(), new Date(2026, 10, 2).getTime(), new Date(2026, 10, 9).getTime()]);
    expect(weeks.map((w) => w.workouts)).toEqual([0, 1, 2]);
    expect(weeks.map((w) => w.sets)).toEqual([0, 1, 3]);
    expect(weeks.map((w) => w.volume)).toEqual([0, 0, 1500]);
  });

  it('covers 12 weeks by default', () => {
    expect(weeklyTotals([], NOW)).toHaveLength(12);
  });
});

describe('sets per muscle group', () => {
  const library = [
    { id: 'bench', name: 'Bench Press', muscle: 'Chest', equipment: 'Barbell', kind: 'weight-reps' },
    { id: 'pull-up', name: 'Pull-Up', muscle: 'Back', equipment: 'Bodyweight', kind: 'reps' },
    { id: 'fly', name: 'Chest Fly', muscle: 'Chest', equipment: 'Dumbbell', kind: 'weight-reps' },
  ] satisfies ExerciseDef[];

  it('totals sets by the library muscle group, most trained first', () => {
    const history = [
      session(at(11, 10), [bench([100, 5], [100, 5]), pullUp(8, 8, 8, 8)]),
      session(at(11, 3), [bench([100, 5]), exercise('fly', 'Chest Fly', 'weight-reps', [{ weight: 20, reps: 12 }, { weight: 20, reps: 12 }])]),
    ];
    expect(setsByMuscle(history, library)).toEqual([
      { muscle: 'Chest', sets: 5 },
      { muscle: 'Back', sets: 4 },
    ]);
  });

  it('falls back to the name, then to Other', () => {
    const byName: Exercise = { ...pullUp(5), defId: undefined, name: ' pull-up ' };
    const unknown = exercise('gone', 'Mystery Lift', 'weight-reps', [{ weight: 10, reps: 10 }]);
    expect(setsByMuscle([session(at(11, 10), [byName, unknown])], library)).toEqual([
      { muscle: 'Back', sets: 1 },
      { muscle: 'Other', sets: 1 },
    ]);
  });
});

describe('exercises logged', () => {
  it('lists each exercise once, most recently performed first', () => {
    const history = [
      session(at(11, 3), [bench([100, 5]), pullUp(8)]),
      session(at(11, 10), [bench([105, 5], [105, 4]), bench([95, 8])]),
    ];
    expect(exercisesLogged(history)).toEqual([
      { key: 'bench', name: 'Bench Press', kind: 'weight-reps', sessions: 2, sets: 4, lastAt: at(11, 10) },
      { key: 'pull-up', name: 'Pull-Up', kind: 'reps', sessions: 1, sets: 1, lastAt: at(11, 3) },
    ]);
  });
});

describe('estimated one-rep max', () => {
  it('uses the Epley formula, with a single rep counting as the weight', () => {
    expect(estimateOneRepMax(200, 1)).toBe(200);
    expect(estimateOneRepMax(100, 30)).toBe(200);
    expect(estimateOneRepMax(150, 6)).toBeCloseTo(180);
  });

  it('is 0 when there is no weight or no whole rep', () => {
    expect(estimateOneRepMax(0, 10)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
    expect(estimateOneRepMax(100, 2.5)).toBe(0);
    expect(estimateOneRepMax(Number.NaN, 5)).toBe(0);
  });
});

describe('exercise progress', () => {
  const record = (history: Session[], key: string, label: string) => exerciseProgress(history, key)?.records.find((r) => r.label === label);

  it('is null for an exercise never logged', () => {
    expect(exerciseProgress([session(at(11, 10), [pullUp(5)])], 'bench')).toBeNull();
  });

  it('finds the records of a weight-and-reps exercise', () => {
    const history = [
      session(at(11, 3), [bench([150, 6], [100, 12])]), // 1RM 180, heaviest 150, set volume 1200, session 2100
      session(at(11, 10), [bench([160, 3], [140, 10], [140, 5])]), // 1RM 186.67, heaviest 160, set volume 1400, session 2580
    ];
    const progress = exerciseProgress(history, 'bench')!;
    expect(progress).toMatchObject({ name: 'Bench Press', sessions: 2, sets: 5 });
    expect(progress.records.map((r) => r.label)).toEqual([
      'Estimated 1RM',
      'Heaviest weight',
      'Best set volume',
      'Best session volume',
      'Most reps in a set',
    ]);
    expect(record(history, 'bench', 'Estimated 1RM')).toMatchObject({ measure: 'weight', at: at(11, 10), set: '140 × 10' });
    expect(record(history, 'bench', 'Estimated 1RM')!.value).toBeCloseTo(186.67, 2);
    expect(record(history, 'bench', 'Heaviest weight')).toMatchObject({ value: 160, set: '160 × 3' });
    expect(record(history, 'bench', 'Best set volume')).toMatchObject({ value: 1400, at: at(11, 10) });
    expect(record(history, 'bench', 'Best session volume')).toMatchObject({ value: 2580, at: at(11, 10) });
    expect(record(history, 'bench', 'Best session volume')!.set).toBeUndefined();
    expect(record(history, 'bench', 'Most reps in a set')).toMatchObject({ value: 12, measure: 'reps', at: at(11, 3) });
  });

  it('charts the best estimated one-rep max of each session, oldest first', () => {
    const history = [session(at(11, 10), [bench([160, 3], [140, 10])]), session(at(11, 3), [bench([150, 6])])];
    const progress = exerciseProgress(history, 'bench')!;
    expect(progress.chart).toEqual({ label: 'Estimated 1RM', measure: 'weight' });
    expect(progress.points.map((p) => p.at)).toEqual([at(11, 3), at(11, 10)]);
    expect(progress.points[0].value).toBeCloseTo(180);
    expect(progress.points[1].value).toBeCloseTo(186.67, 2);
  });

  it('gives a tied record to the session that set it first', () => {
    const history = [session(at(11, 10), [bench([100, 5])]), session(at(11, 3), [bench([100, 5])])];
    expect(record(history, 'bench', 'Heaviest weight')!.at).toBe(at(11, 3));
  });

  it('leaves sets without usable numbers out of records and the chart', () => {
    const empty = exercise('bench', 'Bench Press', 'weight-reps', [{}, { weight: 100 }, { reps: 0, weight: 100 }]);
    const progress = exerciseProgress([session(at(11, 10), [empty])], 'bench')!;
    expect(progress.sets).toBe(3);
    expect(progress.records).toEqual([]);
    expect(progress.points).toEqual([]);
  });

  it('records reps but no weight figures for bodyweight sets of a weighted exercise', () => {
    const history = [session(at(11, 10), [bench([0, 15])])];
    expect(exerciseProgress(history, 'bench')!.records.map((r) => r.label)).toEqual(['Most reps in a set']);
  });

  it('finds the records of a reps-only exercise', () => {
    const history = [session(at(11, 3), [pullUp(10, 6)]), session(at(11, 10), [pullUp(9, 9, 9)])];
    expect(record(history, 'pull-up', 'Most reps in a set')).toMatchObject({ value: 10, at: at(11, 3) });
    expect(record(history, 'pull-up', 'Most reps in a session')).toMatchObject({ value: 27, at: at(11, 10) });
    expect(exerciseProgress(history, 'pull-up')!.points).toEqual([
      { at: at(11, 3), value: 10 },
      { at: at(11, 10), value: 9 },
    ]);
  });

  it('finds the records of a timed exercise', () => {
    const history = [session(at(11, 3), [plank(60, 45)]), session(at(11, 10), [plank(90)])];
    expect(record(history, 'plank', 'Longest time')).toMatchObject({ value: 90, measure: 'seconds' });
    expect(record(history, 'plank', 'Most time in a session')).toMatchObject({ value: 105, at: at(11, 3) });
  });

  it('finds the records of a distance exercise, where the best pace is the lowest', () => {
    const history = [session(at(11, 3), [run([5, 1500])]), session(at(11, 10), [run([3, 840], [2, 700])])];
    expect(record(history, 'run', 'Longest distance')).toMatchObject({ value: 5, at: at(11, 3) });
    expect(record(history, 'run', 'Best pace')).toMatchObject({ value: 280, measure: 'pace', at: at(11, 10) });
    expect(record(history, 'run', 'Most distance in a session')).toMatchObject({ value: 5, at: at(11, 3) });
  });

  it('ignores sessions that logged the exercise a different way', () => {
    const asTime = exercise('pull-up', 'Pull-Up', 'time', [{ seconds: 500 }]);
    const history = [session(at(11, 3), [asTime]), session(at(11, 10), [pullUp(7)])];
    const progress = exerciseProgress(history, 'pull-up')!;
    expect(progress.kind).toBe('reps');
    expect(progress.records.map((r) => r.value)).toEqual([7, 7]);
  });
});

describe('formatting', () => {
  it('writes minutes as hours and minutes', () => {
    expect(formatMinutes(0)).toBe('0 min');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(200)).toBe('3 h 20 min');
  });

  it('writes seconds as a clock once past a minute', () => {
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(90)).toBe('1:30');
    expect(formatSeconds(3725)).toBe('1:02:05');
  });

  it('rounds amounts to one decimal place', () => {
    expect(formatAmount(186.666)).toBe('186.7');
    expect(formatAmount(12500)).toBe('12,500');
    expect(formatAmount(180)).toBe('180');
  });

  it('writes a value in its measure', () => {
    expect(formatMeasure(186.666, 'weight', 'lb')).toBe('186.7 lb');
    expect(formatMeasure(1, 'reps', 'lb')).toBe('1 rep');
    expect(formatMeasure(12, 'reps', 'lb')).toBe('12 reps');
    expect(formatMeasure(90, 'seconds', 'kg')).toBe('1:30');
    expect(formatMeasure(5.25, 'distance', 'kg')).toBe('5.3');
    expect(formatMeasure(280, 'pace', 'kg')).toBe('4:40 per unit');
  });
});
