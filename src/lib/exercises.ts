// R8: the exercise library. Built-in exercises plus any the user creates.
import type { ExerciseKind } from './workouts';

export const MUSCLES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Core',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Full body',
  'Cardio',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const EQUIPMENT = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Other'] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export interface ExerciseDef {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  kind: ExerciseKind;
  custom?: boolean;
}

// name | equipment | kind (w = weight and reps, r = reps only, t = time, d = distance and time)
const LIBRARY: Record<Muscle, string> = {
  Chest: `Bench Press (Barbell)|Barbell|w
Bench Press (Dumbbell)|Dumbbell|w
Incline Bench Press (Barbell)|Barbell|w
Incline Bench Press (Dumbbell)|Dumbbell|w
Decline Bench Press (Barbell)|Barbell|w
Bench Press (Smith Machine)|Machine|w
Floor Press (Dumbbell)|Dumbbell|w
Chest Press (Machine)|Machine|w
Incline Chest Press (Machine)|Machine|w
Chest Fly (Dumbbell)|Dumbbell|w
Incline Chest Fly (Dumbbell)|Dumbbell|w
Pec Deck (Machine)|Machine|w
Cable Crossover|Cable|w
Low-to-High Cable Fly|Cable|w
Push-Up|Bodyweight|r
Incline Push-Up|Bodyweight|r
Chest Dip|Bodyweight|r`,
  Back: `Deadlift (Barbell)|Barbell|w
Rack Pull|Barbell|w
Pull-Up|Bodyweight|r
Chin-Up|Bodyweight|r
Assisted Pull-Up (Machine)|Machine|w
Lat Pulldown (Cable)|Cable|w
Close-Grip Lat Pulldown|Cable|w
Straight-Arm Pulldown|Cable|w
Bent-Over Row (Barbell)|Barbell|w
Pendlay Row|Barbell|w
T-Bar Row|Barbell|w
Dumbbell Row|Dumbbell|w
Seated Cable Row|Cable|w
Seated Row (Machine)|Machine|w
Chest-Supported Row|Machine|w
Inverted Row|Bodyweight|r
Back Extension|Bodyweight|r
Shrug (Barbell)|Barbell|w
Shrug (Dumbbell)|Dumbbell|w`,
  Shoulders: `Overhead Press (Barbell)|Barbell|w
Push Press|Barbell|w
Shoulder Press (Dumbbell)|Dumbbell|w
Arnold Press|Dumbbell|w
Shoulder Press (Machine)|Machine|w
Landmine Press|Barbell|w
Lateral Raise (Dumbbell)|Dumbbell|w
Lateral Raise (Cable)|Cable|w
Lateral Raise (Machine)|Machine|w
Front Raise (Dumbbell)|Dumbbell|w
Rear Delt Fly (Dumbbell)|Dumbbell|w
Reverse Pec Deck (Machine)|Machine|w
Face Pull|Cable|w
Upright Row (Barbell)|Barbell|w
Pike Push-Up|Bodyweight|r`,
  Biceps: `Barbell Curl|Barbell|w
EZ-Bar Curl|Barbell|w
Dumbbell Curl|Dumbbell|w
Hammer Curl|Dumbbell|w
Incline Dumbbell Curl|Dumbbell|w
Concentration Curl|Dumbbell|w
Spider Curl|Dumbbell|w
Preacher Curl (EZ-Bar)|Barbell|w
Preacher Curl (Machine)|Machine|w
Cable Curl|Cable|w
Bayesian Cable Curl|Cable|w`,
  Triceps: `Triceps Pushdown (Bar)|Cable|w
Triceps Pushdown (Rope)|Cable|w
Overhead Triceps Extension (Cable)|Cable|w
Overhead Triceps Extension (Dumbbell)|Dumbbell|w
Skull Crusher|Barbell|w
Close-Grip Bench Press|Barbell|w
Triceps Kickback|Dumbbell|w
Triceps Extension (Machine)|Machine|w
Triceps Dip|Bodyweight|r
Bench Dip|Bodyweight|r
Diamond Push-Up|Bodyweight|r`,
  Forearms: `Wrist Curl|Dumbbell|w
Reverse Wrist Curl|Dumbbell|w
Reverse Curl|Barbell|w
Farmer's Carry|Dumbbell|t
Dead Hang|Bodyweight|t`,
  Core: `Plank|Bodyweight|t
Side Plank|Bodyweight|t
Hollow Hold|Bodyweight|t
Crunch|Bodyweight|r
Sit-Up|Bodyweight|r
Bicycle Crunch|Bodyweight|r
V-Up|Bodyweight|r
Lying Leg Raise|Bodyweight|r
Hanging Leg Raise|Bodyweight|r
Hanging Knee Raise|Bodyweight|r
Russian Twist|Bodyweight|r
Mountain Climber|Bodyweight|r
Dead Bug|Bodyweight|r
Ab Wheel Rollout|Other|r
Cable Crunch|Cable|w
Ab Crunch (Machine)|Machine|w
Pallof Press|Cable|w
Wood Chop (Cable)|Cable|w`,
  Quads: `Back Squat (Barbell)|Barbell|w
Front Squat (Barbell)|Barbell|w
Squat (Smith Machine)|Machine|w
Goblet Squat|Dumbbell|w
Leg Press|Machine|w
Hack Squat (Machine)|Machine|w
Leg Extension|Machine|w
Bulgarian Split Squat|Dumbbell|w
Lunge (Dumbbell)|Dumbbell|w
Walking Lunge|Dumbbell|w
Reverse Lunge|Dumbbell|w
Step-Up|Dumbbell|w
Bodyweight Squat|Bodyweight|r
Pistol Squat|Bodyweight|r
Box Jump|Bodyweight|r
Wall Sit|Bodyweight|t`,
  Hamstrings: `Romanian Deadlift (Barbell)|Barbell|w
Romanian Deadlift (Dumbbell)|Dumbbell|w
Stiff-Leg Deadlift|Barbell|w
Single-Leg Romanian Deadlift|Dumbbell|w
Good Morning|Barbell|w
Lying Leg Curl|Machine|w
Seated Leg Curl|Machine|w
Nordic Curl|Bodyweight|r
Glute-Ham Raise|Bodyweight|r`,
  Glutes: `Hip Thrust (Barbell)|Barbell|w
Hip Thrust (Machine)|Machine|w
Glute Bridge|Bodyweight|r
Sumo Deadlift|Barbell|w
Cable Kickback|Cable|w
Cable Pull-Through|Cable|w
Hip Abduction (Machine)|Machine|w
Hip Adduction (Machine)|Machine|w
Kettlebell Swing|Kettlebell|w`,
  Calves: `Standing Calf Raise (Machine)|Machine|w
Seated Calf Raise|Machine|w
Calf Press (Leg Press)|Machine|w
Calf Raise (Dumbbell)|Dumbbell|w
Single-Leg Calf Raise|Bodyweight|r
Tibialis Raise|Bodyweight|r`,
  'Full body': `Trap Bar Deadlift|Barbell|w
Power Clean|Barbell|w
Clean and Jerk|Barbell|w
Snatch|Barbell|w
Thruster|Barbell|w
Clean and Press (Dumbbell)|Dumbbell|w
Turkish Get-Up|Kettlebell|w
Sled Push|Other|w
Burpee|Bodyweight|r
Battle Ropes|Other|t`,
  Cardio: `Running|Other|d
Treadmill|Machine|d
Walking|Other|d
Incline Walk (Treadmill)|Machine|d
Cycling|Other|d
Stationary Bike|Machine|d
Rowing Machine|Machine|d
Swimming|Other|d
Elliptical|Machine|t
Stair Climber|Machine|t
Jump Rope|Other|t
HIIT|Other|t`,
};

const KIND_CODES: Record<string, ExerciseKind> = { w: 'weight-reps', r: 'reps', t: 'time', d: 'distance' };

export function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const BUILT_IN_EXERCISES: readonly ExerciseDef[] = MUSCLES.flatMap((muscle) =>
  LIBRARY[muscle].split('\n').map((line): ExerciseDef => {
    const [name, equipment, code] = line.split('|');
    return { id: slug(name), name, muscle, equipment: equipment as Equipment, kind: KIND_CODES[code] };
  }),
);

export interface ExerciseFilter {
  query?: string;
  muscle?: Muscle | '';
  equipment?: Equipment | '';
}

/**
 * Exercises matching every word typed (in the name, muscle or equipment) and
 * the chosen filters. Names that start with the query come first.
 */
export function searchExercises(all: readonly ExerciseDef[], filter: ExerciseFilter): ExerciseDef[] {
  const query = (filter.query ?? '').toLowerCase().trim();
  const words = query.split(/\s+/).filter(Boolean);
  const startsWith = (def: ExerciseDef) => (query !== '' && def.name.toLowerCase().startsWith(query) ? 0 : 1);
  return all
    .filter((def) => !filter.muscle || def.muscle === filter.muscle)
    .filter((def) => !filter.equipment || def.equipment === filter.equipment)
    .filter((def) => {
      const haystack = `${def.name} ${def.muscle} ${def.equipment}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .sort((a, b) => startsWith(a) - startsWith(b) || a.name.localeCompare(b.name));
}

/** Makes a user-defined exercise, or returns null when the name is blank or already taken. */
export function createCustomExercise(
  existing: readonly ExerciseDef[],
  input: { name: string; muscle: Muscle; equipment: Equipment; kind: ExerciseKind },
  id: string,
): ExerciseDef | null {
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (name === '') return null;
  if (existing.some((def) => def.name.toLowerCase() === name.toLowerCase())) return null;
  return { id, name, muscle: input.muscle, equipment: input.equipment, kind: input.kind, custom: true };
}

/** Built-in exercises followed by the user's own. */
export function allExercises(custom: readonly ExerciseDef[]): ExerciseDef[] {
  return [...BUILT_IN_EXERCISES, ...custom];
}
