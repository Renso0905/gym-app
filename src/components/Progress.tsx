// R10: the Progress tab and the page for one exercise. All figures come from
// src/lib/progress.ts; this file only lays them out.
import { useMemo, useState } from 'react';
import type { ExerciseDef } from '../lib/exercises';
import {
  exerciseProgress,
  exercisesLogged,
  formatAmount,
  formatMeasure,
  formatMinutes,
  overview,
  PERIODS,
  sessionsInPeriod,
  setsByMuscle,
  weeklyStreaks,
  weeklyTotals,
  type PeriodId,
} from '../lib/progress';
import type { Session } from '../lib/sessions';
import type { WeightUnit } from '../lib/storage';
import { BarChart, LineChart } from './Charts';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const shortDate = (time: number) => new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fullDate = (time: number) => new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="muted">{label}</span>
    </div>
  );
}

interface Props {
  history: Session[];
  library: readonly ExerciseDef[];
  unit: WeightUnit;
  onOpenExercise: (key: string) => void;
}

export function ProgressScreen({ history, library, unit, onOpenExercise }: Props) {
  const [period, setPeriod] = useState<PeriodId>('4w');
  // One clock reading per visit, so every figure on the screen agrees.
  const [now] = useState(() => Date.now());

  const totals = useMemo(() => overview(history, period, now), [history, period, now]);
  const streaks = useMemo(() => weeklyStreaks(history, now), [history, now]);
  const weeks = useMemo(() => weeklyTotals(history, now), [history, now]);
  const muscles = useMemo(() => setsByMuscle(sessionsInPeriod(history, period, now), library), [history, period, now, library]);
  const exercises = useMemo(() => exercisesLogged(history), [history]);
  const mostSets = Math.max(1, ...muscles.map((m) => m.sets));

  if (history.length === 0) {
    return (
      <main className="screen with-tabs">
        <header className="bar">
          <h1>Progress</h1>
        </header>
        <p className="empty">
          Finish a workout to see your progress here: totals, weekly streaks, volume over time, the muscle groups you train and personal records for
          each exercise.
        </p>
      </main>
    );
  }

  return (
    <main className="screen with-tabs">
      <header className="bar">
        <h1>Progress</h1>
      </header>

      <div className="stats">
        <Stat label="Current streak" value={plural(streaks.current, 'week')} />
        <Stat label="Longest streak" value={plural(streaks.longest, 'week')} />
      </div>

      <div className="segmented fill" role="group" aria-label="Period">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="stats">
        <Stat label="Workouts" value={String(totals.workouts)} />
        <Stat label="Per week" value={formatAmount(totals.perWeek)} />
        <Stat label="Total time" value={formatMinutes(totals.minutes)} />
        <Stat label="Average length" value={formatMinutes(totals.averageMinutes)} />
        <Stat label="Sets" value={totals.sets.toLocaleString()} />
        <Stat label="Reps" value={totals.reps.toLocaleString()} />
        <Stat label={`Volume (${unit})`} value={formatAmount(totals.volume)} />
      </div>

      <section className="card">
        <h2 className="section-title">Sets per muscle group</h2>
        {muscles.length === 0 ? (
          <p className="muted">No workouts in this period.</p>
        ) : (
          <ul className="meters">
            {muscles.map((m) => (
              <li key={m.muscle}>
                <span>{m.muscle}</span>
                <span className="meter" aria-hidden="true">
                  <span style={{ width: `${(m.sets / mostSets) * 100}%` }} />
                </span>
                <span className="meter-value">{m.sets}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Volume per week</h2>
        <BarChart
          title={`Volume per week over the last ${weeks.length} weeks`}
          format={(value) => `${formatAmount(value)} ${unit}`}
          items={weeks.map((w) => ({
            label: shortDate(w.start),
            value: w.volume,
            detail: `Week of ${shortDate(w.start)}: ${formatAmount(w.volume)} ${unit}`,
          }))}
        />
      </section>

      <section className="card">
        <h2 className="section-title">Workouts per week</h2>
        <BarChart
          title={`Workouts per week over the last ${weeks.length} weeks`}
          format={(value) => String(value)}
          items={weeks.map((w) => ({
            label: shortDate(w.start),
            value: w.workouts,
            detail: `Week of ${shortDate(w.start)}: ${plural(w.workouts, 'workout')}, ${plural(w.sets, 'set')}`,
          }))}
        />
      </section>

      <h2 className="section-title">Exercises</h2>
      <ul className="cards">
        {exercises.map((e) => (
          <li key={e.key} className="card">
            <button type="button" className="card-main" onClick={() => onOpenExercise(e.key)}>
              <span className="card-title small">{e.name}</span>
              <span className="muted">
                {plural(e.sessions, 'workout')} · {plural(e.sets, 'set')} · last {fullDate(e.lastAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

interface ExerciseProps {
  history: Session[];
  exerciseKey: string;
  unit: WeightUnit;
  onBack: () => void;
}

export function ExerciseProgressScreen({ history, exerciseKey, unit, onBack }: ExerciseProps) {
  const progress = useMemo(() => exerciseProgress(history, exerciseKey), [history, exerciseKey]);
  return (
    <main className="screen">
      <header className="bar">
        <button type="button" className="link" onClick={onBack}>
          ‹ Progress
        </button>
      </header>
      {!progress ? (
        <p className="empty">This exercise has not been logged.</p>
      ) : (
        <>
          <h1>{progress.name}</h1>
          <p className="muted">
            {plural(progress.sessions, 'workout')} · {plural(progress.sets, 'set')} · last {fullDate(progress.lastAt)}
          </p>

          <section className="card">
            <h2 className="section-title">{progress.chart.label} by workout</h2>
            {progress.points.length === 0 ? (
              <p className="muted">No sets with numbers yet.</p>
            ) : (
              <LineChart
                title={`${progress.chart.label} of ${progress.name} over time`}
                format={(value) => formatMeasure(value, progress.chart.measure, unit)}
                items={progress.points.map((p) => ({
                  label: shortDate(p.at),
                  value: p.value,
                  detail: `${fullDate(p.at)}: ${formatMeasure(p.value, progress.chart.measure, unit)}`,
                }))}
              />
            )}
          </section>

          <section className="card">
            <h2 className="section-title">Personal records</h2>
            {progress.records.length === 0 ? (
              <p className="muted">No sets with numbers yet.</p>
            ) : (
              <ul className="records">
                {progress.records.map((r) => (
                  <li key={r.label}>
                    <span>
                      {r.label}
                      <span className="muted">{[r.set, fullDate(r.at)].filter(Boolean).join(' · ')}</span>
                    </span>
                    <strong>{formatMeasure(r.value, r.measure, unit)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
