import { useCallback, useEffect, useState } from 'react';
import type { ExerciseDef } from '../lib/exercises';
import type { Session } from '../lib/sessions';
import {
  loadActiveSession,
  loadCustomExercises,
  loadHistory,
  loadUnit,
  loadWorkouts,
  saveActiveSession,
  saveCustomExercises,
  saveHistory,
  saveUnit,
  saveWorkouts,
  type KeyValueStore,
  type WeightUnit,
} from '../lib/storage';
import type { Workout } from '../lib/workouts';

/** localStorage, or a store that remembers nothing when the browser blocks it. */
function deviceStore(): KeyValueStore {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => { throw new Error('storage unavailable'); } };
  }
}

/** Everything the app remembers. Each change is written to the device straight away. */
export function useAppData() {
  const [store] = useState(deviceStore);
  const [routines, setRoutines] = useState<Workout[]>(() => loadWorkouts(store));
  const [history, setHistory] = useState<Session[]>(() => loadHistory(store));
  const [active, setActive] = useState<Session | null>(() => loadActiveSession(store));
  const [customExercises, setCustomExercises] = useState<ExerciseDef[]>(() => loadCustomExercises(store));
  const [unit, setUnitState] = useState<WeightUnit>(() => loadUnit(store));
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const report = useCallback((what: string, ok: boolean) => setFailed((f) => (f[what] === !ok ? f : { ...f, [what]: !ok })), []);

  useEffect(() => report('routines', saveWorkouts(store, routines)), [store, routines, report]);
  useEffect(() => report('history', saveHistory(store, history)), [store, history, report]);
  useEffect(() => report('active', saveActiveSession(store, active)), [store, active, report]);
  useEffect(() => report('custom', saveCustomExercises(store, customExercises)), [store, customExercises, report]);

  const setUnit = useCallback(
    (next: WeightUnit) => {
      setUnitState(next);
      saveUnit(store, next);
    },
    [store],
  );

  return {
    routines,
    setRoutines,
    history,
    setHistory,
    active,
    setActive,
    customExercises,
    setCustomExercises,
    unit,
    setUnit,
    saveFailed: Object.values(failed).some(Boolean),
  };
}
