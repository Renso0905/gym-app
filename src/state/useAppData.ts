import { useCallback, useEffect, useState } from 'react';
import type { ExerciseDef } from '../lib/exercises';
import type { NutritionData } from '../lib/nutrition';
import type { Session } from '../lib/sessions';
import type { SleepLog } from '../lib/sleep';
import {
  loadActiveSession,
  loadCustomExercises,
  loadHistory,
  loadNutrition,
  loadSleep,
  loadUnit,
  loadWorkouts,
  saveActiveSession,
  saveCustomExercises,
  saveHistory,
  saveNutrition,
  saveSleep,
  saveUnit,
  saveWorkouts,
  parseAppBackup,
  serializeAppBackup,
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
  const [sleep, setSleep] = useState<SleepLog>(() => loadSleep(store));
  const [nutrition, setNutrition] = useState<NutritionData>(() => loadNutrition(store));
  const [unit, setUnitState] = useState<WeightUnit>(() => loadUnit(store));
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const report = useCallback((what: string, ok: boolean) => setFailed((f) => (f[what] === !ok ? f : { ...f, [what]: !ok })), []);

  useEffect(() => report('routines', saveWorkouts(store, routines)), [store, routines, report]);
  useEffect(() => report('history', saveHistory(store, history)), [store, history, report]);
  useEffect(() => report('active', saveActiveSession(store, active)), [store, active, report]);
  useEffect(() => report('custom', saveCustomExercises(store, customExercises)), [store, customExercises, report]);

  useEffect(() => report('sleep', saveSleep(store, sleep)), [store, sleep, report]);
  useEffect(() => report('nutrition', saveNutrition(store, nutrition)), [store, nutrition, report]);

  const setUnit = useCallback(
    (next: WeightUnit) => {
      setUnitState(next);
      saveUnit(store, next);
    },
    [store],
  );

  const exportBackup = useCallback(
    () => serializeAppBackup({ routines, history, active, customExercises, sleep, nutrition, unit }, Date.now()),
    [routines, history, active, customExercises, sleep, nutrition, unit],
  );

  const importBackup = useCallback(
    (raw: string) => {
      const next = parseAppBackup(raw);
      if (!next) return false;
      const saved = {
        routines: saveWorkouts(store, next.routines),
        history: saveHistory(store, next.history),
        active: saveActiveSession(store, next.active),
        custom: saveCustomExercises(store, next.customExercises),
        sleep: saveSleep(store, next.sleep),
        nutrition: saveNutrition(store, next.nutrition),
        unit: saveUnit(store, next.unit),
      };
      for (const [key, ok] of Object.entries(saved)) report(key, ok);
      if (Object.values(saved).some((ok) => !ok)) return false;
      setRoutines(next.routines);
      setHistory(next.history);
      setActive(next.active);
      setCustomExercises(next.customExercises);
      setSleep(next.sleep);
      setNutrition(next.nutrition);
      setUnitState(next.unit);
      return true;
    },
    [store, report],
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
    sleep,
    setSleep,
    nutrition,
    setNutrition,
    unit,
    setUnit,
    exportBackup,
    importBackup,
    saveFailed: Object.values(failed).some(Boolean),
  };
}
