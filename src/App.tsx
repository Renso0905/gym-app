import { isValidSet, type WorkoutSet } from './lib/sets';

const SAMPLE_SETS: WorkoutSet[] = [
  { exercise: 'Squat', reps: 5, weightKg: 100 },
  { exercise: 'Bench press', reps: 8, weightKg: 60 },
];

export function App() {
  const sets = SAMPLE_SETS.filter(isValidSet);
  return (
    <main>
      <h1>Gym Tracker</h1>
      <ul>
        {sets.map((set, i) => (
          <li key={i}>
            {set.exercise}: {set.reps} x {set.weightKg} kg
          </li>
        ))}
      </ul>
    </main>
  );
}
