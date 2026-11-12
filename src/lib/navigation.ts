export const ROOT_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'routines', label: 'Workouts' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'sleep', label: 'Sleep' },
] as const;

export type RootTab = (typeof ROOT_TABS)[number]['id'];
