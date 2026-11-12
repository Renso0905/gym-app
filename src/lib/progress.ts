// R10: progress statistics. Everything here is calculated from the finished
// sessions in the history; nothing is stored. Dates are read in the device's
// local time, and a week runs Monday to Sunday.
import type { ExerciseDef } from './exercises';
import { durationMinutes, sortHistory, type Session } from './sessions';
import { exerciseKey, formatSet, summarize, type Exercise, type ExerciseKind, type PlannedSet } from './workouts';

// --- dates ------------------------------------------------------------------

/** When a session counts as having happened. */
export function sessionTime(session: Session): number {
  return session.finishedAt ?? session.startedAt;
}

/** Calendar days are added through Date so a daylight-saving change never shifts midnight. */
function addDays(time: number, days: number): number {
  const date = new Date(time);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function dayStart(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Midnight on the Monday of the week containing `time`. */
export function weekStart(time: number): number {
  const day = new Date(dayStart(time));
  return addDays(day.getTime(), -((day.getDay() + 6) % 7));
}

/** Whole weeks from the week of `from` to the week of `to`, counting both. */
function weeksSpanned(from: number, to: number): number {
  return Math.max(1, Math.round((weekStart(to) - weekStart(from)) / (7 * 86400000)) + 1);
}

// --- periods ----------------------------------------------------------------

export type PeriodId = '4w' | '3m' | '1y' | 'all';

/** `days` is absent for all time. */
export const PERIODS: ReadonlyArray<{ id: PeriodId; label: string; days?: number }> = [
  { id: '4w', label: '4 weeks', days: 28 },
  { id: '3m', label: '3 months', days: 91 },
  { id: '1y', label: '1 year', days: 365 },
  { id: 'all', label: 'All time' },
];

function periodDays(period: PeriodId): number | undefined {
  return PERIODS.find((p) => p.id === period)?.days;
}

/** The sessions inside the period: today and the days before it, up to the period's length. */
export function sessionsInPeriod(history: Session[], period: PeriodId, now: number): Session[] {
  const days = periodDays(period);
  if (days === undefined) return history;
  const from = addDays(dayStart(now), -(days - 1));
  return history.filter((s) => sessionTime(s) >= from);
}

// --- simple stats -----------------------------------------------------------

export interface Overview {
  workouts: number;
  minutes: number;
  /** Mean workout length in whole minutes; 0 with no workouts. */
  averageMinutes: number;
  sets: number;
  reps: number;
  /** R2 volume, in the user's weight unit. */
  volume: number;
  /**
   * Workouts per week over the period. A period that reaches back before the
   * first workout ever logged is measured from that workout instead, so a new
   * user's average is not diluted by weeks before they started.
   */
  perWeek: number;
}

function repsIn(session: Session): number {
  return session.exercises
    .filter((e) => e.kind === 'weight-reps' || e.kind === 'reps')
    .reduce((n, e) => n + e.sets.reduce((m, s) => m + (s.reps ?? 0), 0), 0);
}

export function overview(history: Session[], period: PeriodId, now: number): Overview {
  const sessions = sessionsInPeriod(history, period, now);
  const workouts = sessions.length;
  let minutes = 0;
  let sets = 0;
  let reps = 0;
  let volume = 0;
  for (const session of sessions) {
    const summary = summarize(session);
    minutes += durationMinutes(session, sessionTime(session));
    sets += summary.sets;
    volume += summary.volume;
    reps += repsIn(session);
  }
  let perWeek = 0;
  if (workouts > 0) {
    const first = Math.min(...history.map(sessionTime));
    const days = periodDays(period);
    const sinceFirst = weeksSpanned(first, now);
    perWeek = workouts / (days === undefined ? sinceFirst : Math.min(days / 7, sinceFirst));
  }
  return { workouts, minutes, averageMinutes: workouts > 0 ? Math.round(minutes / workouts) : 0, sets, reps, volume, perWeek };
}

export interface Streaks {
  /** Consecutive weeks with a workout, ending this week, or last week if this week has none yet. */
  current: number;
  longest: number;
}

export function weeklyStreaks(history: Session[], now: number): Streaks {
  const weeks = [...new Set(history.map((s) => weekStart(sessionTime(s))))].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  weeks.forEach((week, i) => {
    run = i > 0 && addDays(weeks[i - 1], 7) === week ? run + 1 : 1;
    longest = Math.max(longest, run);
  });

  const trained = new Set(weeks);
  let cursor = weekStart(now);
  if (!trained.has(cursor)) cursor = addDays(cursor, -7);
  let current = 0;
  while (trained.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -7);
  }
  return { current, longest };
}

// --- advanced stats ---------------------------------------------------------

export interface WeekTotals {
  /** Midnight on the week's Monday. */
  start: number;
  workouts: number;
  sets: number;
  volume: number;
}

/** Totals for each of the last `weeks` weeks, oldest first, ending with the current week. */
export function weeklyTotals(history: Session[], now: number, weeks = 12): WeekTotals[] {
  const thisWeek = weekStart(now);
  const buckets = new Map<number, WeekTotals>();
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    buckets.set(start, { start, workouts: 0, sets: 0, volume: 0 });
  }
  for (const session of history) {
    const bucket = buckets.get(weekStart(sessionTime(session)));
    if (!bucket) continue;
    const summary = summarize(session);
    bucket.workouts += 1;
    bucket.sets += summary.sets;
    bucket.volume += summary.volume;
  }
  return [...buckets.values()];
}

export const OTHER_MUSCLE = 'Other';

export interface MuscleSets {
  muscle: string;
  sets: number;
}

/**
 * Logged sets per muscle group, most trained first. The group comes from the
 * library entry the exercise was picked from, or one with the same name;
 * anything else counts as "Other".
 */
export function setsByMuscle(sessions: Session[], library: readonly ExerciseDef[]): MuscleSets[] {
  const byId = new Map(library.map((def) => [def.id, def.muscle]));
  const byName = new Map(library.map((def) => [def.name.trim().toLowerCase(), def.muscle]));
  const totals = new Map<string, number>();
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (exercise.sets.length === 0) continue;
      const muscle =
        (exercise.defId !== undefined ? byId.get(exercise.defId) : undefined) ?? byName.get(exercise.name.trim().toLowerCase()) ?? OTHER_MUSCLE;
      totals.set(muscle, (totals.get(muscle) ?? 0) + exercise.sets.length);
    }
  }
  return [...totals.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
}

// --- per exercise -----------------------------------------------------------

export interface ExerciseUsage {
  /** The same key "last time" uses, so an exercise is followed across routines. */
  key: string;
  name: string;
  kind: ExerciseKind;
  /** Number of workouts it was logged in. */
  sessions: number;
  sets: number;
  lastAt: number;
}

/** Every exercise that has been logged, most recently performed first. */
export function exercisesLogged(history: Session[]): ExerciseUsage[] {
  const found = new Map<string, ExerciseUsage>();
  for (const session of sortHistory(history)) {
    const seen = new Set<string>();
    for (const exercise of session.exercises) {
      if (exercise.sets.length === 0) continue;
      const key = exerciseKey(exercise);
      let usage = found.get(key);
      if (!usage) {
        // Newest session first, so the first sighting carries the current name and kind.
        usage = { key, name: exercise.name.trim() || 'Exercise', kind: exercise.kind, sessions: 0, sets: 0, lastAt: sessionTime(session) };
        found.set(key, usage);
      }
      usage.sets += exercise.sets.length;
      if (!seen.has(key)) usage.sessions += 1;
      seen.add(key);
    }
  }
  return [...found.values()];
}

/**
 * Estimated one-rep max by the Epley formula. A single rep is the weight
 * itself. 0 when there is nothing to estimate from.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (!(weight > 0) || !Number.isInteger(reps) || reps < 1) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

export type Measure = 'weight' | 'reps' | 'seconds' | 'distance' | 'pace';

export interface PersonalRecord {
  label: string;
  value: number;
  measure: Measure;
  /** When it was set. The earliest session wins a tie. */
  at: number;
  /** The set it came from, e.g. "225 × 5", when the record is a single set. */
  set?: string;
}

export interface ProgressPoint {
  at: number;
  value: number;
}

export interface ExerciseProgress extends ExerciseUsage {
  records: PersonalRecord[];
  /** What `points` measures: the best value in each session, oldest first. */
  chart: { label: string; measure: Measure };
  points: ProgressPoint[];
}

const has = (value: number | undefined): value is number => value !== undefined && Number.isFinite(value);

/** One candidate per set, or per session; the best of them becomes a record. */
interface Candidate {
  value: number;
  at: number;
  set?: string;
}

interface Metric {
  label: string;
  measure: Measure;
  /** Lower is better (pace). */
  lowest?: boolean;
  /** Value of one set, or undefined when the set cannot be measured this way. */
  ofSet?: (set: PlannedSet) => number | undefined;
  /** Value of a whole session's sets. */
  ofSession?: (sets: PlannedSet[]) => number | undefined;
}

const positive = (value: number | undefined): number | undefined => (has(value) && value > 0 ? value : undefined);
const liftedReps = (set: PlannedSet): number | undefined => (has(set.reps) && Number.isInteger(set.reps) && set.reps > 0 ? set.reps : undefined);
const sum = (values: Array<number | undefined>): number | undefined => {
  const total = values.reduce<number>((n, v) => n + (v ?? 0), 0);
  return total > 0 ? total : undefined;
};
const setVolume = (set: PlannedSet): number | undefined => {
  const reps = liftedReps(set);
  return reps !== undefined ? positive((set.weight ?? 0) * reps) : undefined;
};
const oneRepMax = (set: PlannedSet): number | undefined => positive(estimateOneRepMax(set.weight ?? 0, liftedReps(set) ?? 0));

/** The records kept for each kind of exercise. The first one is also what the chart plots. */
const METRICS: Readonly<Record<ExerciseKind, readonly Metric[]>> = {
  'weight-reps': [
    { label: 'Estimated 1RM', measure: 'weight', ofSet: oneRepMax },
    { label: 'Heaviest weight', measure: 'weight', ofSet: (s) => (liftedReps(s) !== undefined ? positive(s.weight) : undefined) },
    { label: 'Best set volume', measure: 'weight', ofSet: setVolume },
    { label: 'Best session volume', measure: 'weight', ofSession: (sets) => sum(sets.map(setVolume)) },
    { label: 'Most reps in a set', measure: 'reps', ofSet: liftedReps },
  ],
  reps: [
    { label: 'Most reps in a set', measure: 'reps', ofSet: liftedReps },
    { label: 'Most reps in a session', measure: 'reps', ofSession: (sets) => sum(sets.map(liftedReps)) },
  ],
  time: [
    { label: 'Longest time', measure: 'seconds', ofSet: (s) => positive(s.seconds) },
    { label: 'Most time in a session', measure: 'seconds', ofSession: (sets) => sum(sets.map((s) => positive(s.seconds))) },
  ],
  distance: [
    { label: 'Longest distance', measure: 'distance', ofSet: (s) => positive(s.distance) },
    {
      label: 'Best pace',
      measure: 'pace',
      lowest: true,
      ofSet: (s) => (positive(s.distance) && positive(s.seconds) ? s.seconds! / s.distance! : undefined),
    },
    { label: 'Most distance in a session', measure: 'distance', ofSession: (sets) => sum(sets.map((s) => positive(s.distance))) },
  ],
};

function candidates(metric: Metric, exercise: Exercise, at: number): Candidate[] {
  if (metric.ofSession) {
    const value = metric.ofSession(exercise.sets);
    return value === undefined ? [] : [{ value, at }];
  }
  return exercise.sets.flatMap((set) => {
    const value = metric.ofSet?.(set);
    return value === undefined ? [] : [{ value, at, set: formatSet(exercise.kind, set) }];
  });
}

const better = (metric: Metric, a: number, b: number): boolean => (metric.lowest ? a < b : a > b);

/**
 * Records and the chart for one exercise, or null when it was never logged.
 * Only sessions that logged it the way it is measured now are counted, so a
 * custom exercise whose kind changed does not mix reps with seconds.
 */
export function exerciseProgress(history: Session[], key: string): ExerciseProgress | null {
  const usage = exercisesLogged(history).find((u) => u.key === key);
  if (!usage) return null;
  const metrics = METRICS[usage.kind];

  // Oldest first, so a later session only takes a record by beating it.
  const logged = sortHistory(history)
    .reverse()
    .flatMap((session) =>
      session.exercises
        .filter((e) => exerciseKey(e) === key && e.kind === usage.kind && e.sets.length > 0)
        .map((exercise) => ({ exercise, at: sessionTime(session) })),
    );

  const records: PersonalRecord[] = [];
  for (const metric of metrics) {
    let best: Candidate | undefined;
    for (const { exercise, at } of logged) {
      for (const candidate of candidates(metric, exercise, at)) {
        if (!best || better(metric, candidate.value, best.value)) best = candidate;
      }
    }
    if (best) records.push({ label: metric.label, measure: metric.measure, value: best.value, at: best.at, set: best.set });
  }

  const charted = metrics[0];
  const bySession = new Map<number, number>();
  for (const { exercise, at } of logged) {
    for (const { value } of candidates(charted, exercise, at)) {
      const soFar = bySession.get(at);
      if (soFar === undefined || better(charted, value, soFar)) bySession.set(at, value);
    }
  }
  const points = [...bySession.entries()].map(([at, value]) => ({ at, value }));

  return { ...usage, records, chart: { label: charted.label, measure: charted.measure }, points };
}

// --- display ----------------------------------------------------------------

/** Minutes as "45 min" or "3 h 20 min". */
export function formatMinutes(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Seconds as "45s", "1:30" or "1:02:05". */
export function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total}s`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** A number with at most one decimal place and thousands separators. */
export function formatAmount(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
}

/** A value in its measure. Distances have no unit in the app, so pace is time per unit of distance. */
export function formatMeasure(value: number, measure: Measure, weightUnit: string): string {
  switch (measure) {
    case 'weight':
      return `${formatAmount(value)} ${weightUnit}`;
    case 'reps':
      return `${formatAmount(value)} ${value === 1 ? 'rep' : 'reps'}`;
    case 'seconds':
      return formatSeconds(value);
    case 'distance':
      return formatAmount(value);
    case 'pace':
      return `${formatSeconds(value)} per unit`;
  }
}
