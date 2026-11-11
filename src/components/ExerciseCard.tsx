import type { WeightUnit } from '../lib/storage';
import {
  FIELDS_BY_KIND,
  formatSet,
  type Exercise,
  type ExercisePatch,
  type PlannedSet,
  type SetField,
  type SetValues,
} from '../lib/workouts';
import { ConfirmButton } from './ConfirmButton';
import { NumberField } from './NumberField';

interface Props {
  exercise: Exercise;
  index: number;
  count: number;
  unit: WeightUnit;
  /** "plan" edits a routine's outline; "log" records a session and shows last time's numbers. */
  mode: 'plan' | 'log';
  /** Log mode: the sets done last time, by position. */
  previous?: PlannedSet[];
  onChange: (patch: ExercisePatch) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onAddSet: () => void;
  onSetChange: (setId: string, values: SetValues) => void;
  onRemoveSet: (setId: string) => void;
  onToggleDone?: (setId: string, previous: SetValues | undefined) => void;
}

function fieldLabel(field: SetField, unit: WeightUnit): string {
  switch (field) {
    case 'weight':
      return unit;
    case 'reps':
      return 'Reps';
    case 'seconds':
      return 'Sec';
    case 'distance':
      return unit === 'kg' ? 'km' : 'mi';
  }
}

export function ExerciseCard(props: Props) {
  const { exercise, index, count, unit, mode, previous = [] } = props;
  const log = mode === 'log';
  const fields = FIELDS_BY_KIND[exercise.kind];
  const title = exercise.name.trim() || `Exercise ${index + 1}`;
  const columns = {
    gridTemplateColumns: log
      ? `1.5rem minmax(0, 1.2fr) repeat(${fields.length}, minmax(0, 1fr)) 2.75rem`
      : `2rem repeat(${fields.length}, minmax(0, 1fr)) 2.75rem`,
  };
  const lastSet = exercise.sets[exercise.sets.length - 1];

  return (
    <li className="card exercise">
      <div className="exercise-head">
        <h2 className="exercise-title">{title}</h2>
        <button type="button" className="icon" aria-label={`Move ${title} up`} disabled={index === 0} onClick={() => props.onMove(-1)}>
          ↑
        </button>
        <button type="button" className="icon" aria-label={`Move ${title} down`} disabled={index === count - 1} onClick={() => props.onMove(1)}>
          ↓
        </button>
      </div>

      {exercise.sets.length > 0 && (
        <div className="sets" role="table" aria-label={`Sets of ${title}`}>
          <div className="set-row set-head muted" role="row" style={columns}>
            <span role="columnheader">Set</span>
            {log && <span role="columnheader">Previous</span>}
            {fields.map((field) => (
              <span key={field} role="columnheader">
                {fieldLabel(field, unit)}
              </span>
            ))}
            <span />
          </div>
          {exercise.sets.map((set, i) => {
            const prev = previous[i];
            const prevText = prev ? formatSet(exercise.kind, prev) : '';
            return (
              <div key={set.id} className={set.done ? 'set-row done' : 'set-row'} role="row" style={columns}>
                <span className="set-number" role="cell">
                  {i + 1}
                </span>
                {log && (
                  <button
                    type="button"
                    className="prev"
                    disabled={!prevText}
                    aria-label={prevText ? `Use last time for set ${i + 1} of ${title}: ${prevText}` : `No previous set ${i + 1} for ${title}`}
                    onClick={() => prev && props.onSetChange(set.id, Object.fromEntries(fields.map((f) => [f, prev[f]])))}
                  >
                    {prevText || '–'}
                  </button>
                )}
                {fields.map((field) => (
                  <NumberField
                    key={field}
                    label={`${title}, set ${i + 1}, ${fieldLabel(field, unit)}`}
                    value={set[field]}
                    integer={field === 'reps' || field === 'seconds'}
                    onChange={(value) => props.onSetChange(set.id, { [field]: value })}
                  />
                ))}
                {log ? (
                  <button
                    type="button"
                    className="icon check"
                    aria-pressed={set.done === true}
                    aria-label={`Set ${i + 1} of ${title} done`}
                    onClick={() => props.onToggleDone?.(set.id, prev)}
                  >
                    ✓
                  </button>
                ) : (
                  <button type="button" className="icon" aria-label={`Remove set ${i + 1} of ${title}`} onClick={() => props.onRemoveSet(set.id)}>
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="row-actions">
        <button type="button" onClick={props.onAddSet}>
          + Add set
        </button>
        {log && (
          <button type="button" disabled={!lastSet} onClick={() => lastSet && props.onRemoveSet(lastSet.id)}>
            − Remove set
          </button>
        )}
      </div>

      <details>
        <summary>Rest, notes and more</summary>
        <label className="field">
          <span className="muted">Rest between sets (sec)</span>
          <NumberField label={`Rest for ${title} in seconds`} value={exercise.restSeconds} integer onChange={(restSeconds) => props.onChange({ restSeconds })} />
        </label>
        <label className="field stacked">
          <span className="muted">Notes</span>
          <textarea
            rows={2}
            placeholder="Cues, tempo, machine settings…"
            value={exercise.notes}
            onChange={(e) => props.onChange({ notes: e.currentTarget.value })}
          />
        </label>
        <div className="row-actions">
          <button type="button" onClick={props.onDuplicate}>
            Duplicate
          </button>
          <ConfirmButton label="Remove exercise" confirmLabel="Confirm" onConfirm={props.onRemove} />
        </div>
      </details>
    </li>
  );
}
