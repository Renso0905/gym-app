import { describe, expect, it } from 'vitest';
import { homeWorkout } from './home';
import { createWorkout, updateWorkout } from './workouts';

const first = updateWorkout(createWorkout(1, 'first'), { name: 'Push day' }, 1);
const second = updateWorkout(createWorkout(2, 'second'), { name: 'Pull day' }, 2);

describe('Home workout selection', () => {
  it('keeps the chosen routine while it exists', () => {
    expect(homeWorkout([first, second], 'second')).toBe(second);
  });

  it('falls back to the first routine when the choice is missing or was deleted', () => {
    expect(homeWorkout([first, second], '')).toBe(first);
    expect(homeWorkout([first, second], 'deleted')).toBe(first);
  });

  it('has no selection when there are no routines', () => {
    expect(homeWorkout([], 'first')).toBeUndefined();
  });
});
