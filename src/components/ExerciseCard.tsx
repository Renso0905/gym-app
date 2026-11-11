import type { WeightUnit } from '../lib/storage';
import {
  EXERCISE_KINDS,
  FIELDS_BY_KIND,
  type Exercise,
  type ExerciseKind,
  type ExercisePatch,
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
  autoFocusName: boolean;
  onChange: (patch: ExercisePatch) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onAddSet: () => void;
  onSetChange: (setId: string, values: SetValues) => void;
  onRemoveSet: (setId: string) => void;
}

function fieldLabel(field: SetField, unit: WeightUnit): string {
  switch (field) {
    case 'weight':
      return `Weight (${unit})`;
    case 'reps':
      return 'Reps';
    case 'seconds':
      return 'Time (sec)';
    case 'distance':
      return `Distance (${unit === 'kg' ? 'km' : 'mi'})`;
  }
}

export function ExerciseCard(props: Props) {
  const { exercise, index, count, unit } = props;
  const fields = FIELDS_BY_KIND[exercise.kind];
  const title = exercise.name.trim() || `Exercise ${index + 1}`;
  const columns = { gridTemplateColumns: `2rem repeat(${fields.length}, 1fr) 2.75rem` };

  return (
    <li className="card exercise">
      <div className="exercise-head">
        <input
          className="title-input"
          aria-label={`Name of exercise ${index + 1}`}
          placeholder="Exercise name"
          value={exercise.name}
          autoFocus={props.autoFocusName}
          enterKeyHint="done"
          onChange={(e) => props.onChange({ name: e.currentTarget.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        <button type="button" className="icon" aria-label={`Move ${title} up`} disabled={index === 0} onClick={() => props.onMove(-1)}>
          ↑
        </button>
        <button type="button" className="icon" aria-label={`Move ${title} down`} disabled={index === count - 1} onClick={() => props.onMove(1)}>
          ↓
        </button>
      </div>

      <label className="field">
        <span className="muted">Measured by</span>
        <select value={exercise.kind} onChange={(e) => props.onChange({ kind: e.currentTarget.value as ExerciseKind })}>
          {EXERCISE_KINDS.map(({ kind, label }) => (
            <option key={kind} value={kind}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {exercise.sets.length > 0 && (
        <div className="sets" role="table" aria-label={`Sets of ${title}`}>
          <div className="set-row set-head muted" role="row" style={columns}>
            <span role="columnheader">Set</span>
            {fields.map((field) => (
              <span key={field} role="columnheader">
                {fieldLabel(field, unit)}
              </span>
            ))}
            <span />
          </div>
          {exercise.sets.map((set, i) => (
            <div key={set.id} className="set-row" role="row" style={columns}>
              <span className="set-number" role="cell">
                {i + 1}
              </span>
              {fields.map((field) => (
                <NumberField
                  key={field}
                  label={`${title}, set ${i + 1}, ${fieldLabel(field, unit)}`}
                  value={set[field]}
                  integer={field === 'reps' || field === 'seconds'}
                  onChange={(value) => props.onSetChange(set.id, { [field]: value })}
                />
              ))}
              <button type="button" className="icon" aria-label={`Remove set ${i + 1} of ${title}`} onClick={() => props.onRemoveSet(set.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="wide" onClick={props.onAddSet}>
        + Add set
      </button>

      <details>
        <summary>Rest and notes</summary>
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
      </details>

      <div className="row-actions">
        <button type="button" onClick={props.onDuplicate}>
          Duplicate
        </button>
        <ConfirmButton label="Remove" confirmLabel="Confirm" onConfirm={props.onRemove} />
      </div>
    </li>
  );
}
