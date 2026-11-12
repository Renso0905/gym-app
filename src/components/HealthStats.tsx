import { LineChart, type ChartItem } from './Charts';
import {
  formatNutritionAmount,
  nutritionProgress,
  nutritionStatistics,
  type NutritionData,
} from '../lib/nutrition';
import { formatHours, parseDayKey, sleepProgress, sleepStatistics, type SleepLog } from '../lib/sleep';

function shortDate(key: string): string {
  const parts = parseDayKey(key)!;
  return new Date(parts.year, parts.month, parts.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function percent(value: number | undefined): string {
  return value === undefined ? '—' : `${Math.round(value)}%`;
}

interface SleepStatsProps {
  sleep: SleepLog;
  now: number;
  onBack: () => void;
}

export function SleepStatsScreen({ sleep, now, onBack }: SleepStatsProps) {
  const stats = sleepStatistics(sleep, now, 30);
  const points = sleepProgress(sleep, now, 30);
  const chart: ChartItem[] = points.map((point) => ({
    label: shortDate(point.key),
    value: point.hours,
    detail: `${shortDate(point.key)}: ${formatHours(point.hours)}`,
  }));

  return (
    <main className="screen with-tabs health-stats-screen">
      <header className="bar stats-header">
        <button type="button" className="link" onClick={onBack}>‹ Sleep</button>
        <h1>Sleep stats</h1>
      </header>
      <p className="muted stats-period">Last 30 days · missing nights are not counted as zero</p>

      {stats.tracked === 0 ? (
        <p className="empty">Track a night of sleep to start seeing your statistics and progress.</p>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><span className="muted">Nights tracked</span><strong className="stat-value">{stats.tracked}</strong></div>
            <div className="stat"><span className="muted">Average</span><strong className="stat-value">{formatHours(stats.average!)}</strong></div>
            <div className="stat"><span className="muted">Longest night</span><strong className="stat-value">{formatHours(stats.longest!)}</strong></div>
            <div className="stat">
              <span className="muted">7+ hour nights</span>
              <strong className="stat-value">{percent(stats.sevenPlusPercent)}</strong>
              <span className="muted">{stats.sevenPlus} of {stats.tracked}</span>
            </div>
          </div>
          <section className="card stats-chart-card">
            <div>
              <p className="eyebrow">Progress</p>
              <h2 className="section-title">Nightly sleep</h2>
            </div>
            <LineChart items={chart} title="Nightly sleep over the last 30 days" format={formatHours} />
          </section>
        </>
      )}
    </main>
  );
}

interface NutritionStatsProps {
  nutrition: NutritionData;
  now: number;
  onBack: () => void;
}

export function NutritionStatsScreen({ nutrition, now, onBack }: NutritionStatsProps) {
  const stats = nutritionStatistics(nutrition, now, 30);
  const points = nutritionProgress(nutrition, now, 30);
  const chart: ChartItem[] = points.map((point) => ({
    label: shortDate(point.key),
    value: point.calories,
    detail: `${shortDate(point.key)}: ${formatNutritionAmount(point.calories)} kcal`,
  }));

  return (
    <main className="screen with-tabs health-stats-screen">
      <header className="bar stats-header">
        <button type="button" className="link" onClick={onBack}>‹ Nutrition</button>
        <h1>Nutrition stats</h1>
      </header>
      <p className="muted stats-period">Last 30 days · averages use days with food logged</p>

      {stats.tracked === 0 ? (
        <p className="empty">Log food for a day to start seeing your statistics and progress.</p>
      ) : (
        <>
          <div className="stats">
            <div className="stat"><span className="muted">Days tracked</span><strong className="stat-value">{stats.tracked}</strong></div>
            <div className="stat">
              <span className="muted">Average calories</span>
              <strong className="stat-value">{formatNutritionAmount(stats.averageCalories!)} kcal</strong>
            </div>
            <div className="stat">
              <span className="muted">Days on target</span>
              <strong className="stat-value">{percent(stats.onTargetPercent)}</strong>
              <span className="muted">95–110% of goal</span>
            </div>
            <div className="stat">
              <span className="muted">Average protein</span>
              <strong className="stat-value">{formatNutritionAmount(stats.averageProtein!)} g</strong>
            </div>
            <div className="stat">
              <span className="muted">Average fiber</span>
              <strong className="stat-value">{formatNutritionAmount(stats.averageFiber!)} g</strong>
            </div>
            <div className="stat">
              <span className="muted">Calorie goal</span>
              <strong className="stat-value">{formatNutritionAmount(nutrition.goals.calories)} kcal</strong>
            </div>
          </div>
          <section className="card stats-chart-card">
            <div>
              <p className="eyebrow">Progress</p>
              <h2 className="section-title">Daily calories</h2>
            </div>
            <LineChart
              items={chart}
              title="Daily calories over the last 30 days"
              format={(value) => `${formatNutritionAmount(value)} kcal`}
              reference={{ value: nutrition.goals.calories, label: 'Goal' }}
            />
          </section>
        </>
      )}
    </main>
  );
}
