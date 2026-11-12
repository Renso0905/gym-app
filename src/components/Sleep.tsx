// R15: the Sleep tab. A month of circles, one per day, coloured by the hours
// slept. The rules are in src/lib/sleep.ts; this file lays them out.
import { useState } from 'react';
import {
  dateKey,
  formatHours,
  monthCalendar,
  monthSummary,
  parseDayKey,
  setSleep,
  shiftMonth,
  SLEEP_BANDS,
  sleepBand,
  stepHours,
  type CalendarDay,
  type SleepLog,
} from '../lib/sleep';
import { NumberField } from './NumberField';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function longDate(key: string): string {
  const parts = parseDayKey(key);
  if (!parts) return key;
  return new Date(parts.year, parts.month, parts.day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function describe(cell: CalendarDay): string {
  const date = longDate(cell.key);
  if (cell.when === 'future') return `${date}, not here yet`;
  return cell.hours === undefined ? `${date}, not tracked` : `${date}, ${formatHours(cell.hours)}`;
}

interface Props {
  sleep: SleepLog;
  saveFailed: boolean;
  onChange: (next: SleepLog) => void;
}

export function SleepScreen({ sleep, saveFailed, onChange }: Props) {
  // One clock reading per visit, so "today" cannot change under the screen.
  const [now] = useState(() => Date.now());
  const today = dateKey(now);
  const current = parseDayKey(today)!;
  const [view, setView] = useState({ year: current.year, month: current.month });
  const [selected, setSelected] = useState(today);

  const weeks = monthCalendar(sleep, view.year, view.month, now);
  const summary = monthSummary(sleep, view.year, view.month);
  const atCurrentMonth = view.year === current.year && view.month === current.month;
  const monthName = new Date(view.year, view.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const hours: number | undefined = sleep[selected];
  const record = (value: number | undefined) => onChange(setSleep(sleep, selected, value));

  return (
    <main className="screen with-tabs">
      <header className="bar">
        <h1>Sleep</h1>
      </header>
      {saveFailed && <p className="status error">Could not save to this device. Your latest changes may be lost.</p>}

      <div className="month-nav">
        <button type="button" className="icon" aria-label="Previous month" onClick={() => setView(shiftMonth(view.year, view.month, -1))}>
          ‹
        </button>
        <h2 className="section-title" aria-live="polite">
          {monthName}
        </h2>
        <button
          type="button"
          className="icon"
          aria-label="Next month"
          disabled={atCurrentMonth}
          onClick={() => setView(shiftMonth(view.year, view.month, 1))}
        >
          ›
        </button>
      </div>

      <div className="calendar" role="grid" aria-label={`Sleep in ${monthName}`}>
        <div className="calendar-row" role="row">
          {WEEKDAYS.map((name) => (
            <span key={name} className="calendar-head" role="columnheader" aria-label={name}>
              {name[0]}
            </span>
          ))}
        </div>
        {weeks.map((week, i) => (
          <div key={i} className="calendar-row" role="row">
            {week.map((cell, j) =>
              cell === null ? (
                <span key={j} role="gridcell" />
              ) : (
                <span key={j} role="gridcell">
                  <button
                    type="button"
                    className={[
                      'day',
                      cell.when,
                      cell.hours === undefined ? 'untracked' : `band-${sleepBand(cell.hours)}`,
                      cell.key === selected ? 'selected' : '',
                    ].join(' ')}
                    aria-label={describe(cell)}
                    aria-pressed={cell.key === selected}
                    aria-current={cell.when === 'today' ? 'date' : undefined}
                    disabled={cell.when === 'future'}
                    onClick={() => setSelected(cell.key)}
                  >
                    <span className="day-number">{cell.day}</span>
                    {cell.hours !== undefined && <span className="day-hours">{formatHours(cell.hours)}</span>}
                  </button>
                </span>
              ),
            )}
          </div>
        ))}
      </div>

      <p className="muted center">
        {summary.average === undefined
          ? 'No nights tracked this month.'
          : `${summary.tracked} ${summary.tracked === 1 ? 'night' : 'nights'} tracked · average ${formatHours(summary.average)}`}
      </p>

      <section className="card">
        <h2 className="section-title">
          {longDate(selected)}
          {selected === today && <span className="muted"> · today</span>}
        </h2>
        <div className="sleep-entry">
          <button type="button" className="icon" aria-label="Half an hour less" onClick={() => record(stepHours(hours, -1))}>
            −
          </button>
          <NumberField label={`Hours slept, ${longDate(selected)}`} value={hours} onChange={record} />
          <span className="muted">hours</span>
          <button type="button" className="icon" aria-label="Half an hour more" onClick={() => record(stepHours(hours, 1))}>
            +
          </button>
        </div>
        <p className="muted">
          {hours === undefined ? 'Not tracked. Enter the hours you slept the night before.' : 'Saved. Clear the number to remove this night.'}
        </p>
        {hours !== undefined && (
          <button type="button" onClick={() => record(undefined)}>
            Clear
          </button>
        )}
      </section>

      <ul className="legend" aria-label="Colours">
        {SLEEP_BANDS.map((entry) => (
          <li key={entry.band}>
            <span className={`swatch band-${entry.band}`} aria-hidden="true" />
            {entry.label}
          </li>
        ))}
        <li>
          <span className="swatch untracked" aria-hidden="true" />
          Not tracked
        </li>
      </ul>
    </main>
  );
}
