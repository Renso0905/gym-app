import { useMemo, useState } from 'react';
import { ExercisePicker } from './components/ExercisePicker';
import { RoutineUpdatePrompt } from './components/RoutineUpdatePrompt';
import { HistoryDetail, HistoryList } from './components/History';
import { Home } from './components/Home';
import { NutritionScreen } from './components/Nutrition';
import { ExerciseProgressScreen, ProgressScreen } from './components/Progress';
import { SessionScreen } from './components/SessionScreen';
import { SleepScreen } from './components/Sleep';
import { WorkoutEditor } from './components/WorkoutEditor';
import { WorkoutList } from './components/WorkoutList';
import { allExercises, type ExerciseDef } from './lib/exercises';
import { ROOT_TABS, type RootTab } from './lib/navigation';
import { applySessionToRoutine, finishSession, routineChanges, startSession } from './lib/sessions';
import {
  addExercises,
  createWorkout,
  displayName,
  duplicateWorkout,
  exerciseFromDef,
  insertAfter,
  isBlankWorkout,
  removeWorkout,
  replaceExercise,
  upsertWorkout,
  type Workout,
} from './lib/workouts';
import { useAppData } from './state/useAppData';

type Screen =
  | { name: 'root' }
  | { name: 'routine'; id: string }
  | { name: 'session' }
  | { name: 'history' }
  | { name: 'history-detail'; id: string }
  | { name: 'progress' }
  | { name: 'exercise-progress'; key: string };

export function App() {
  const data = useAppData();
  const { routines, setRoutines, history, setHistory, active, setActive, unit } = data;
  const [tab, setTab] = useState<RootTab>('home');
  const [homeWorkoutId, setHomeWorkoutId] = useState('');
  const [screen, setScreen] = useState<Screen>({ name: 'root' });
  const [picking, setPicking] = useState<null | { replace?: string }>(null);
  // Set after finishing a workout that differed from its routine, until the lifter answers.
  const [pendingUpdate, setPendingUpdate] = useState<null | { routineId: string; sessionId: string; changes: string[] }>(null);
  const library = useMemo(() => allExercises(data.customExercises), [data.customExercises]);

  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo(0, 0);
  };

  const routine = screen.name === 'routine' ? routines.find((w) => w.id === screen.id) : undefined;
  const past = screen.name === 'history-detail' ? history.find((s) => s.id === screen.id) : undefined;

  function start(from: Workout | null) {
    if (active) return;
    setActive(startSession(from, Date.now()));
    go({ name: 'session' });
  }

  function addPicked(defs: ExerciseDef[]) {
    const swap = picking?.replace;
    if (swap && defs[0]) {
      if (screen.name === 'session' && active) setActive(replaceExercise(active, swap, defs[0], Date.now()));
      else if (routine) setRoutines((list) => upsertWorkout(list, replaceExercise(routine, swap, defs[0], Date.now())));
      setPicking(null);
      return;
    }
    const exercises = defs.map((def) => exerciseFromDef(def));
    if (screen.name === 'session' && active) setActive(addExercises(active, exercises, Date.now()));
    else if (routine) setRoutines((list) => upsertWorkout(list, addExercises(routine, exercises, Date.now())));
    setPicking(null);
  }

  if (picking) {
    return (
      <ExercisePicker
        exercises={library}
        mode={picking.replace ? 'replace' : 'add'}
        onAdd={addPicked}
        onCreateCustom={(def) => data.setCustomExercises((list) => [...list, def])}
        onCancel={() => setPicking(null)}
      />
    );
  }

  if (screen.name === 'session' && active) {
    return (
      <SessionScreen
        session={active}
        history={history}
        unit={unit}
        saveFailed={data.saveFailed}
        onChange={setActive}
        onAddExercises={() => setPicking({})}
        onReplaceExercise={(id) => setPicking({ replace: id })}
        onBack={() => go({ name: 'root' })}
        onDiscard={() => {
          setActive(null);
          go({ name: 'root' });
        }}
        onFinish={() => {
          const finished = finishSession(active, Date.now());
          if (!finished) return;
          setHistory((list) => [finished, ...list]);
          const from = routines.find((r) => r.id === finished.routineId);
          const changes = from ? routineChanges(from, finished) : [];
          setPendingUpdate(from && changes.length > 0 ? { routineId: from.id, sessionId: finished.id, changes } : null);
          setActive(null);
          setTab('routines');
          go({ name: 'history-detail', id: finished.id });
        }}
      />
    );
  }

  if (routine) {
    return (
      <WorkoutEditor
        key={routine.id}
        workout={routine}
        unit={unit}
        saveFailed={data.saveFailed}
        canStart={active === null}
        onChange={(next) => setRoutines((list) => upsertWorkout(list, next))}
        onAddExercises={() => setPicking({})}
        onReplaceExercise={(id) => setPicking({ replace: id })}
        onStart={() => start(routine)}
        onDone={() => {
          // A routine left completely empty was a false start, not something to keep.
          if (isBlankWorkout(routine)) setRoutines((list) => removeWorkout(list, routine.id));
          go({ name: 'root' });
        }}
        onDelete={() => {
          setRoutines((list) => removeWorkout(list, routine.id));
          go({ name: 'root' });
        }}
      />
    );
  }

  if (past) {
    const prompt = pendingUpdate?.sessionId === past.id ? pendingUpdate : null;
    const promptRoutine = prompt ? routines.find((r) => r.id === prompt.routineId) : undefined;
    return (
      <>
      <HistoryDetail
        session={past}
        unit={unit}
        onBack={() => go({ name: 'history' })}
        onDelete={() => {
          setHistory((list) => removeWorkout(list, past.id));
          go({ name: 'history' });
        }}
      />
      {prompt && promptRoutine && (
        <RoutineUpdatePrompt
          routineName={displayName(promptRoutine)}
          changes={prompt.changes}
          onKeep={() => setPendingUpdate(null)}
          onUpdate={() => {
            setRoutines((list) => upsertWorkout(list, applySessionToRoutine(promptRoutine, past, Date.now())));
            setPendingUpdate(null);
          }}
        />
      )}
      </>
    );
  }

  if (screen.name === 'history') {
    return <HistoryList history={history} unit={unit} onOpen={(id) => go({ name: 'history-detail', id })} onBack={() => go({ name: 'progress' })} />;
  }

  if (screen.name === 'exercise-progress') {
    return <ExerciseProgressScreen history={history} exerciseKey={screen.key} unit={unit} onBack={() => go({ name: 'progress' })} />;
  }

  return (
    <>
      {screen.name === 'progress' ? (
        <ProgressScreen
          history={history}
          library={library}
          unit={unit}
          onBack={() => go({ name: 'root' })}
          onOpenHistory={() => go({ name: 'history' })}
          onOpenExercise={(key) => go({ name: 'exercise-progress', key })}
        />
      ) : tab === 'home' ? (
        <Home
          data={{ routines, history, unit }}
          active={active}
          chosenWorkoutId={homeWorkoutId}
          onChooseWorkout={setHomeWorkoutId}
          onResume={() => go({ name: 'session' })}
          onStart={start}
          onOpenRoutines={() => {
            setTab('routines');
            window.scrollTo(0, 0);
          }}
        />
      ) : tab === 'sleep' ? (
        <SleepScreen sleep={data.sleep} saveFailed={data.saveFailed} onChange={data.setSleep} />
      ) : tab === 'nutrition' ? (
        <NutritionScreen nutrition={data.nutrition} saveFailed={data.saveFailed} onChange={data.setNutrition} />
      ) : (
        <WorkoutList
          workouts={routines}
          active={active}
          unit={unit}
          onUnitChange={data.setUnit}
          onOpenProgress={() => go({ name: 'progress' })}
          onCreate={() => {
            const created = createWorkout(Date.now());
            setRoutines((list) => upsertWorkout(list, created));
            go({ name: 'routine', id: created.id });
          }}
          onOpen={(id) => go({ name: 'routine', id })}
          onDuplicate={(id) =>
            setRoutines((list) => {
              const original = list.find((w) => w.id === id);
              return original ? insertAfter(list, id, duplicateWorkout(original, Date.now())) : list;
            })
          }
          onDelete={(id) => setRoutines((list) => removeWorkout(list, id))}
          onStart={start}
          onResume={() => go({ name: 'session' })}
        />
      )}
      <nav className="tabs" aria-label="Sections">
        {ROOT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => {
              setTab(t.id);
              go({ name: 'root' });
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}
