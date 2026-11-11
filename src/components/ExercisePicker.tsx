import { useMemo, useState } from 'react';
import {
  createCustomExercise,
  EQUIPMENT,
  MUSCLES,
  searchExercises,
  type Equipment,
  type ExerciseDef,
  type Muscle,
} from '../lib/exercises';
import { EXERCISE_KINDS, newId, type ExerciseKind } from '../lib/workouts';

interface Props {
  exercises: ExerciseDef[];
  onAdd: (selected: ExerciseDef[]) => void;
  onCreateCustom: (def: ExerciseDef) => void;
  onCancel: () => void;
}

/** Full-screen search over the exercise library. Tap to select several, then add them together. */
export function ExercisePicker({ exercises, onAdd, onCreateCustom, onCancel }: Props) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | ''>('');
  const [equipment, setEquipment] = useState<Equipment | ''>('');
  const [selected, setSelected] = useState<ExerciseDef[]>([]);
  const [creating, setCreating] = useState(false);

  const results = useMemo(() => searchExercises(exercises, { query, muscle, equipment }), [exercises, query, muscle, equipment]);
  const isSelected = (def: ExerciseDef) => selected.some((s) => s.id === def.id);
  const toggle = (def: ExerciseDef) => setSelected((list) => (list.some((s) => s.id === def.id) ? list.filter((s) => s.id !== def.id) : [...list, def]));

  if (creating) {
    return (
      <CustomExerciseForm
        initialName={query.trim()}
        initialMuscle={muscle || 'Chest'}
        initialEquipment={equipment || 'Barbell'}
        existing={exercises}
        onCancel={() => setCreating(false)}
        onCreate={(def) => {
          onCreateCustom(def);
          setSelected((list) => [...list, def]);
          setQuery('');
          setCreating(false);
        }}
      />
    );
  }

  return (
    <main className="screen picker">
      <header className="bar">
        <button type="button" className="link" onClick={onCancel}>
          Cancel
        </button>
        <strong>Add exercises</strong>
        <button type="button" className="link" onClick={() => setCreating(true)}>
          + Custom
        </button>
      </header>

      <div className="picker-controls">
        <input
          type="search"
          aria-label="Search exercises"
          placeholder="Search exercises"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        <div className="filters">
          <select aria-label="Muscle group" value={muscle} onChange={(e) => setMuscle(e.currentTarget.value as Muscle | '')}>
            <option value="">All muscles</option>
            {MUSCLES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select aria-label="Equipment" value={equipment} onChange={(e) => setEquipment(e.currentTarget.value as Equipment | '')}>
            <option value="">All equipment</option>
            {EQUIPMENT.map((eq) => (
              <option key={eq}>{eq}</option>
            ))}
          </select>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="empty">
          <p>No exercise matches{query.trim() ? ` “${query.trim()}”` : ''}.</p>
          <button type="button" onClick={() => setCreating(true)}>
            Create {query.trim() ? `“${query.trim()}”` : 'a custom exercise'}
          </button>
        </div>
      ) : (
        <ul className="pick-list">
          {results.map((def) => (
            <li key={def.id}>
              <button type="button" className="pick-row" aria-pressed={isSelected(def)} onClick={() => toggle(def)}>
                <span className="pick-text">
                  <span className="pick-name">{def.name}</span>
                  <span className="muted">
                    {def.muscle} · {def.equipment}
                    {def.custom ? ' · Custom' : ''}
                  </span>
                </span>
                <span className="pick-check" aria-hidden="true">
                  {isSelected(def) ? '✓' : '+'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="sticky-footer">
        <button type="button" className="primary wide" disabled={selected.length === 0} onClick={() => onAdd(selected)}>
          {selected.length === 0 ? 'Select exercises' : `Add ${selected.length} exercise${selected.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </main>
  );
}

interface FormProps {
  initialName: string;
  initialMuscle: Muscle;
  initialEquipment: Equipment;
  existing: ExerciseDef[];
  onCreate: (def: ExerciseDef) => void;
  onCancel: () => void;
}

function CustomExerciseForm({ initialName, initialMuscle, initialEquipment, existing, onCreate, onCancel }: FormProps) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<Muscle>(initialMuscle);
  const [equipment, setEquipment] = useState<Equipment>(initialEquipment);
  const [kind, setKind] = useState<ExerciseKind>('weight-reps');
  const [error, setError] = useState('');

  function submit() {
    const def = createCustomExercise(existing, { name, muscle, equipment, kind }, `custom-${newId()}`);
    if (def) onCreate(def);
    else setError(name.trim() === '' ? 'Give the exercise a name.' : 'An exercise with that name already exists.');
  }

  return (
    <main className="screen">
      <header className="bar">
        <button type="button" className="link" onClick={onCancel}>
          ‹ Back
        </button>
        <strong>New exercise</strong>
        <span />
      </header>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="field stacked">
          <span className="muted">Name</span>
          <input
            autoFocus
            value={name}
            placeholder="Exercise name"
            onChange={(e) => {
              setName(e.currentTarget.value);
              setError('');
            }}
          />
        </label>
        <label className="field stacked">
          <span className="muted">Muscle group</span>
          <select value={muscle} onChange={(e) => setMuscle(e.currentTarget.value as Muscle)}>
            {MUSCLES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="field stacked">
          <span className="muted">Equipment</span>
          <select value={equipment} onChange={(e) => setEquipment(e.currentTarget.value as Equipment)}>
            {EQUIPMENT.map((eq) => (
              <option key={eq}>{eq}</option>
            ))}
          </select>
        </label>
        <label className="field stacked">
          <span className="muted">Measured by</span>
          <select value={kind} onChange={(e) => setKind(e.currentTarget.value as ExerciseKind)}>
            {EXERCISE_KINDS.map((k) => (
              <option key={k.kind} value={k.kind}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="status error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary wide">
          Create exercise
        </button>
      </form>
    </main>
  );
}
