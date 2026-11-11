import { useCallback, useEffect, useState } from 'react';
import { loadUnit, loadWorkouts, saveUnit, saveWorkouts, type KeyValueStore, type WeightUnit } from '../lib/storage';
import type { Workout } from '../lib/workouts';

/** localStorage, or a store that remembers nothing when the browser blocks it. */
function deviceStore(): KeyValueStore {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => { throw new Error('storage unavailable'); } };
  }
}

/** The saved workouts and weight unit. Every change is written to the device straight away. */
export function useWorkouts() {
  const [store] = useState(deviceStore);
  const [workouts, setWorkouts] = useState<Workout[]>(() => loadWorkouts(store));
  const [unit, setUnitState] = useState<WeightUnit>(() => loadUnit(store));
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setSaveFailed(!saveWorkouts(store, workouts));
  }, [store, workouts]);

  const setUnit = useCallback(
    (next: WeightUnit) => {
      setUnitState(next);
      saveUnit(store, next);
    },
    [store],
  );

  return { workouts, setWorkouts, unit, setUnit, saveFailed };
}
