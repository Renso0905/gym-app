import { useState } from 'react';
import { WorkoutEditor } from './components/WorkoutEditor';
import { WorkoutList } from './components/WorkoutList';
import { createWorkout, duplicateWorkout, insertAfter, isBlankWorkout, removeWorkout, upsertWorkout, type Workout } from './lib/workouts';
import { useWorkouts } from './state/useWorkouts';

export function App() {
  const { workouts, setWorkouts, unit, setUnit, saveFailed } = useWorkouts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = workouts.find((w) => w.id === editingId);

  function openNew() {
    const workout = createWorkout(Date.now());
    setWorkouts((list) => upsertWorkout(list, workout));
    setEditingId(workout.id);
  }

  function closeEditor(workout: Workout) {
    // A workout left completely empty was a false start, not something to keep.
    if (isBlankWorkout(workout)) setWorkouts((list) => removeWorkout(list, workout.id));
    setEditingId(null);
    window.scrollTo(0, 0);
  }

  if (editing) {
    return (
      <WorkoutEditor
        key={editing.id}
        workout={editing}
        unit={unit}
        saveFailed={saveFailed}
        onChange={(next) => setWorkouts((list) => upsertWorkout(list, next))}
        onDone={() => closeEditor(editing)}
        onDelete={() => {
          setWorkouts((list) => removeWorkout(list, editing.id));
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <WorkoutList
      workouts={workouts}
      unit={unit}
      onUnitChange={setUnit}
      onCreate={openNew}
      onOpen={setEditingId}
      onDuplicate={(id) =>
        setWorkouts((list) => {
          const original = list.find((w) => w.id === id);
          return original ? insertAfter(list, id, duplicateWorkout(original, Date.now())) : list;
        })
      }
      onDelete={(id) => setWorkouts((list) => removeWorkout(list, id))}
    />
  );
}
