import { useMemo, useState } from 'react';
import { ExercisePicker } from './components/ExercisePicker';
import { HistoryDetail, HistoryList } from './components/History';
import { SessionScreen } from './components/SessionScreen';
import { WorkoutEditor } from './components/WorkoutEditor';
import { WorkoutList } from './components/WorkoutList';
import { allExercises, type ExerciseDef } from './lib/exercises';
import { finishSession, startSession } from './lib/sessions';
import {
  addExercises,
  createWorkout,
  duplicateWorkout,
  exerciseFromDef,
  insertAfter,
  isBlankWorkout,
  removeWorkout,
  upsertWorkout,
  type Workout,
} from './lib/workouts';
import { useAppData } from './state/useAppData';

type Screen =
  | { name: 'home' }
  | { name: 'routine'; id: string }
  | { name: 'session' }
  | { name: 'history-detail'; id: string };

export function App() {
  const data = useAppData();
  const { routines, setRoutines, history, setHistory, active, setActive, unit } = data;
  const [tab, setTab] = useState<'routines' | 'history'>('routines');
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [picking, setPicking] = useState(false);
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
    const exercises = defs.map((def) => exerciseFromDef(def));
    if (screen.name === 'session' && active) setActive(addExercises(active, exercises, Date.now()));
    else if (routine) setRoutines((list) => upsertWorkout(list, addExercises(routine, exercises, Date.now())));
    setPicking(false);
  }

  if (picking) {
    return (
      <ExercisePicker
        exercises={library}
        onAdd={addPicked}
        onCreateCustom={(def) => data.setCustomExercises((list) => [...list, def])}
        onCancel={() => setPicking(false)}
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
        onAddExercises={() => setPicking(true)}
        onBack={() => go({ name: 'home' })}
        onDiscard={() => {
          setActive(null);
          go({ name: 'home' });
        }}
        onFinish={() => {
          const finished = finishSession(active, Date.now());
          if (!finished) return;
          setHistory((list) => [finished, ...list]);
          setActive(null);
          setTab('history');
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
        onAddExercises={() => setPicking(true)}
        onStart={() => start(routine)}
        onDone={() => {
          // A routine left completely empty was a false start, not something to keep.
          if (isBlankWorkout(routine)) setRoutines((list) => removeWorkout(list, routine.id));
          go({ name: 'home' });
        }}
        onDelete={() => {
          setRoutines((list) => removeWorkout(list, routine.id));
          go({ name: 'home' });
        }}
      />
    );
  }

  if (past) {
    return (
      <HistoryDetail
        session={past}
        unit={unit}
        onBack={() => go({ name: 'home' })}
        onDelete={() => {
          setHistory((list) => removeWorkout(list, past.id));
          go({ name: 'home' });
        }}
      />
    );
  }

  return (
    <>
      {tab === 'routines' ? (
        <WorkoutList
          workouts={routines}
          active={active}
          unit={unit}
          onUnitChange={data.setUnit}
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
      ) : (
        <HistoryList history={history} unit={unit} onOpen={(id) => go({ name: 'history-detail', id })} />
      )}
      <nav className="tabs" aria-label="Sections">
        <button type="button" aria-current={tab === 'routines' ? 'page' : undefined} onClick={() => setTab('routines')}>
          Routines
        </button>
        <button type="button" aria-current={tab === 'history' ? 'page' : undefined} onClick={() => setTab('history')}>
          History
        </button>
      </nav>
    </>
  );
}
