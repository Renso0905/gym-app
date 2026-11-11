import { describe, expect, it } from 'vitest';
import { allExercises, BUILT_IN_EXERCISES, createCustomExercise, EQUIPMENT, MUSCLES, searchExercises, slug } from './exercises';
import { EXERCISE_KINDS } from './workouts';

const names = (list: { name: string }[]) => list.map((d) => d.name);

describe('built-in library', () => {
  it('has a broad set of exercises covering every muscle group', () => {
    expect(BUILT_IN_EXERCISES.length).toBeGreaterThanOrEqual(150);
    for (const muscle of MUSCLES) {
      expect(BUILT_IN_EXERCISES.some((d) => d.muscle === muscle), muscle).toBe(true);
    }
  });

  it('has well-formed entries with unique ids and names', () => {
    const kinds = EXERCISE_KINDS.map((k) => k.kind);
    for (const def of BUILT_IN_EXERCISES) {
      expect(def.name.trim(), def.id).not.toBe('');
      expect(EQUIPMENT, def.name).toContain(def.equipment);
      expect(kinds, def.name).toContain(def.kind);
      expect(def.id).toBe(slug(def.name));
    }
    expect(new Set(BUILT_IN_EXERCISES.map((d) => d.id)).size).toBe(BUILT_IN_EXERCISES.length);
    expect(new Set(BUILT_IN_EXERCISES.map((d) => d.name.toLowerCase())).size).toBe(BUILT_IN_EXERCISES.length);
  });

  it('measures exercises the sensible way', () => {
    const kind = (name: string) => BUILT_IN_EXERCISES.find((d) => d.name === name)?.kind;
    expect(kind('Bench Press (Barbell)')).toBe('weight-reps');
    expect(kind('Pull-Up')).toBe('reps');
    expect(kind('Plank')).toBe('time');
    expect(kind('Running')).toBe('distance');
  });
});

describe('searchExercises', () => {
  it('returns everything, alphabetically, with no query or filters', () => {
    const all = searchExercises(BUILT_IN_EXERCISES, {});
    expect(all).toHaveLength(BUILT_IN_EXERCISES.length);
    expect(names(all)).toEqual([...names(all)].sort((a, b) => a.localeCompare(b)));
  });

  it('matches regardless of case and surrounding spaces', () => {
    expect(names(searchExercises(BUILT_IN_EXERCISES, { query: '  BENCH press ' }))).toContain('Bench Press (Barbell)');
  });

  it('needs every typed word, in any order, across name, muscle and equipment', () => {
    const results = names(searchExercises(BUILT_IN_EXERCISES, { query: 'dumbbell bench' }));
    expect(results).toContain('Bench Press (Dumbbell)');
    expect(results).not.toContain('Bench Press (Barbell)');
    expect(names(searchExercises(BUILT_IN_EXERCISES, { query: 'calves machine' }))).toContain('Seated Calf Raise');
  });

  it('puts names that start with the query first', () => {
    const results = names(searchExercises(BUILT_IN_EXERCISES, { query: 'squat' }));
    expect(results[0]).toBe('Squat (Smith Machine)');
    expect(results).toContain('Back Squat (Barbell)');
  });

  it('applies muscle and equipment filters together with the query', () => {
    const results = searchExercises(BUILT_IN_EXERCISES, { query: 'curl', muscle: 'Biceps', equipment: 'Cable' });
    expect(results.length).toBeGreaterThan(0);
    for (const def of results) {
      expect(def.muscle).toBe('Biceps');
      expect(def.equipment).toBe('Cable');
    }
    expect(names(results)).not.toContain('Lying Leg Curl');
  });

  it('returns nothing for a query that matches nothing', () => {
    expect(searchExercises(BUILT_IN_EXERCISES, { query: 'zzzz' })).toEqual([]);
  });
});

describe('custom exercises', () => {
  const input = { name: '  Cable   Y-Raise ', muscle: 'Shoulders', equipment: 'Cable', kind: 'weight-reps' } as const;

  it('creates one with a tidied name and marks it custom', () => {
    expect(createCustomExercise(BUILT_IN_EXERCISES, input, 'c1')).toEqual({
      id: 'c1',
      name: 'Cable Y-Raise',
      muscle: 'Shoulders',
      equipment: 'Cable',
      kind: 'weight-reps',
      custom: true,
    });
  });

  it('refuses a blank name or one that already exists, ignoring case', () => {
    expect(createCustomExercise(BUILT_IN_EXERCISES, { ...input, name: '   ' }, 'c1')).toBeNull();
    expect(createCustomExercise(BUILT_IN_EXERCISES, { ...input, name: 'pull-up' }, 'c1')).toBeNull();
  });

  it('is searchable alongside the built-in ones', () => {
    const custom = createCustomExercise(BUILT_IN_EXERCISES, input, 'c1')!;
    const all = allExercises([custom]);
    expect(all).toHaveLength(BUILT_IN_EXERCISES.length + 1);
    expect(names(searchExercises(all, { query: 'y-raise' }))).toEqual(['Cable Y-Raise']);
  });
});
