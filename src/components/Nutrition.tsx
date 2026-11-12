import { useState } from 'react';
import {
  addFood,
  createFoodEntry,
  formatNutritionAmount,
  nutritionTotals,
  removeFood,
  setNutritionGoals,
  shiftDayKey,
  type NutritionData,
} from '../lib/nutrition';
import { dateKey, parseDayKey } from '../lib/sleep';
import { newId } from '../lib/workouts';
import { NumberField } from './NumberField';

interface Props {
  nutrition: NutritionData;
  saveFailed: boolean;
  onChange: (next: NutritionData) => void;
}

function longDate(key: string): string {
  const parts = parseDayKey(key)!;
  return new Date(parts.year, parts.month, parts.day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function ProgressBar({ value, goal }: { value: number; goal: number }) {
  const percent = Math.min(100, (value / goal) * 100);
  return (
    <div
      className="nutrition-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={Math.min(value, goal)}
      aria-valuetext={`${formatNutritionAmount(value)} of ${formatNutritionAmount(goal)}`}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

export function NutritionScreen({ nutrition, saveFailed, onChange }: Props) {
  const [now] = useState(() => Date.now());
  const today = dateKey(now);
  const [selected, setSelected] = useState(today);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState<number | undefined>();
  const [protein, setProtein] = useState<number | undefined>();
  const [fiber, setFiber] = useState<number | undefined>();
  const [calorieGoal, setCalorieGoal] = useState<number | undefined>(nutrition.goals.calories);
  const [proteinGoal, setProteinGoal] = useState<number | undefined>(nutrition.goals.protein);
  const [fiberGoal, setFiberGoal] = useState<number | undefined>(nutrition.goals.fiber);

  const foods = nutrition.days[selected] ?? [];
  const totals = nutritionTotals(foods);
  const calorieDifference = nutrition.goals.calories - totals.calories;

  function logFood() {
    const entry = createFoodEntry({ name, calories, protein, fiber }, newId());
    if (!entry) return;
    onChange(addFood(nutrition, selected, entry));
    setName('');
    setCalories(undefined);
    setProtein(undefined);
    setFiber(undefined);
  }

  return (
    <main className="screen with-tabs nutrition-screen">
      <header className="bar">
        <div>
          <p className="eyebrow">Daily fuel</p>
          <h1>Nutrition</h1>
        </div>
      </header>
      {saveFailed && <p className="status error">Could not save to this device. Your latest changes may be lost.</p>}

      <div className="day-nav">
        <button type="button" className="icon" aria-label="Previous day" onClick={() => setSelected(shiftDayKey(selected, -1))}>
          ‹
        </button>
        <div className="day-nav-title">
          <strong>{selected === today ? 'Today' : longDate(selected)}</strong>
          <span className="muted">{selected === today ? longDate(selected) : selected}</span>
        </div>
        <button
          type="button"
          className="icon"
          aria-label="Next day"
          disabled={selected >= today}
          onClick={() => setSelected(shiftDayKey(selected, 1))}
        >
          ›
        </button>
      </div>

      <section className="calorie-card" aria-label="Calorie progress">
        <div className="calorie-ring">
          <strong>{formatNutritionAmount(totals.calories)}</strong>
          <span>of {formatNutritionAmount(nutrition.goals.calories)} kcal</span>
        </div>
        <div className="calorie-copy">
          <span className="muted">{calorieDifference >= 0 ? 'Remaining' : 'Over goal'}</span>
          <strong>{formatNutritionAmount(Math.abs(calorieDifference))} kcal</strong>
          <ProgressBar value={totals.calories} goal={nutrition.goals.calories} />
        </div>
      </section>

      <div className="macro-grid" aria-label="Macro progress">
        <div className="macro-card protein">
          <span className="muted">Protein</span>
          <strong>{formatNutritionAmount(totals.protein)} g</strong>
          {nutrition.goals.protein ? (
            <>
              <ProgressBar value={totals.protein} goal={nutrition.goals.protein} />
              <small>Goal {formatNutritionAmount(nutrition.goals.protein)} g</small>
            </>
          ) : (
            <small>No goal set</small>
          )}
        </div>
        <div className="macro-card fiber">
          <span className="muted">Fiber</span>
          <strong>{formatNutritionAmount(totals.fiber)} g</strong>
          {nutrition.goals.fiber ? (
            <>
              <ProgressBar value={totals.fiber} goal={nutrition.goals.fiber} />
              <small>Goal {formatNutritionAmount(nutrition.goals.fiber)} g</small>
            </>
          ) : (
            <small>No goal set</small>
          )}
        </div>
      </div>

      <details className="card goal-settings">
        <summary>Daily goals</summary>
        <p className="muted">Calories are required. Protein and fiber are optional.</p>
        <div className="goal-grid">
          <label className="field stacked">
            <span>Calories</span>
            <NumberField label="Daily calorie goal" value={calorieGoal} onChange={setCalorieGoal} integer />
          </label>
          <label className="field stacked">
            <span>Protein (g)</span>
            <NumberField label="Daily protein goal" value={proteinGoal} onChange={setProteinGoal} />
          </label>
          <label className="field stacked">
            <span>Fiber (g)</span>
            <NumberField label="Daily fiber goal" value={fiberGoal} onChange={setFiberGoal} />
          </label>
        </div>
        <button
          type="button"
          className="primary wide"
          disabled={calorieGoal === undefined || calorieGoal <= 0}
          onClick={() => onChange(setNutritionGoals(nutrition, { calories: calorieGoal, protein: proteinGoal, fiber: fiberGoal }))}
        >
          Save goals
        </button>
      </details>

      <section className="nutrition-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Food database</p>
            <h2 className="section-title">Find a food</h2>
          </div>
          <span className="coming-soon">Coming soon</span>
        </div>
        <input
          type="search"
          aria-label="Search the future food database"
          placeholder="Search foods, meals or brands"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        <p className="muted search-note">
          {search ? `“${search}” will be searchable when the food database is connected.` : 'Database search is ready to connect. Add food manually for now.'}
        </p>
      </section>

      <section className="card quick-add">
        <div>
          <p className="eyebrow">Manual entry</p>
          <h2 className="section-title">Quick add</h2>
        </div>
        <label className="field stacked">
          <span>Food or meal</span>
          <input value={name} placeholder="e.g. Chicken rice bowl" onChange={(event) => setName(event.currentTarget.value)} />
        </label>
        <div className="food-fields">
          <label className="field stacked">
            <span>Calories</span>
            <NumberField label="Food calories" value={calories} onChange={setCalories} integer />
          </label>
          <label className="field stacked">
            <span>Protein (g)</span>
            <NumberField label="Food protein in grams" value={protein} onChange={setProtein} />
          </label>
          <label className="field stacked">
            <span>Fiber (g)</span>
            <NumberField label="Food fiber in grams" value={fiber} onChange={setFiber} />
          </label>
        </div>
        <button type="button" className="primary wide" disabled={name.trim() === '' || calories === undefined} onClick={logFood}>
          Add to {selected === today ? 'today' : longDate(selected)}
        </button>
      </section>

      <section className="nutrition-section">
        <div className="section-heading">
          <h2 className="section-title">Food log</h2>
          <span className="muted">{foods.length} {foods.length === 1 ? 'item' : 'items'}</span>
        </div>
        {foods.length === 0 ? (
          <p className="empty compact">Nothing logged yet. Add your first food above.</p>
        ) : (
          <ul className="food-log">
            {foods.map((food) => (
              <li key={food.id}>
                <div>
                  <strong>{food.name}</strong>
                  <span className="muted">
                    {food.protein !== undefined ? `${formatNutritionAmount(food.protein)} g protein` : 'Protein not entered'}
                    {' · '}
                    {food.fiber !== undefined ? `${formatNutritionAmount(food.fiber)} g fiber` : 'Fiber not entered'}
                  </span>
                </div>
                <div className="food-energy">
                  <strong>{formatNutritionAmount(food.calories)}</strong>
                  <span className="muted">kcal</span>
                </div>
                <button
                  type="button"
                  className="icon danger"
                  aria-label={`Remove ${food.name}`}
                  onClick={() => onChange(removeFood(nutrition, selected, food.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
