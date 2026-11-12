import { useEffect, useRef, useState, type FormEvent } from 'react';
import { foodSearchResultDraft, searchFoods, type FoodSearchResult } from '../lib/food-search';
import {
  addFood,
  createFoodEntry,
  formatNutritionAmount,
  nutritionMonthCalendar,
  nutritionTotals,
  removeFood,
  setNutritionGoals,
  shiftDayKey,
  type NutritionData,
} from '../lib/nutrition';
import { dateKey, parseDayKey, shiftMonth } from '../lib/sleep';
import { newId } from '../lib/workouts';
import { NumberField } from './NumberField';
import { NutritionStatsScreen } from './HealthStats';

interface Props {
  nutrition: NutritionData;
  saveFailed: boolean;
  onChange: (next: NutritionData) => void;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

function PreviousDaysCalendar({
  nutrition,
  now,
  selected,
  onSelect,
  onClose,
}: {
  nutrition: NutritionData;
  now: number;
  selected: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const today = dateKey(now);
  const current = parseDayKey(today)!;
  const initial = parseDayKey(selected) ?? current;
  const [view, setView] = useState({ year: initial.year, month: initial.month });
  const weeks = nutritionMonthCalendar(nutrition, view.year, view.month, now);
  const atCurrentMonth = view.year === current.year && view.month === current.month;
  const monthName = new Date(view.year, view.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="modal-backdrop">
      <section className="modal nutrition-calendar-modal" role="dialog" aria-modal="true" aria-labelledby="nutrition-calendar-title">
        <header className="bar">
          <div>
            <p className="eyebrow">Food history</p>
            <h2 id="nutrition-calendar-title">Previous days</h2>
          </div>
          <button type="button" className="icon" aria-label="Close calendar" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="month-nav">
          <button
            type="button"
            className="icon"
            aria-label="Previous month"
            onClick={() => setView(shiftMonth(view.year, view.month, -1))}
          >
            ‹
          </button>
          <h3>{monthName}</h3>
          <button
            type="button"
            className="icon"
            aria-label="Next month"
            disabled={atCurrentMonth}
            onClick={() => setView(shiftMonth(view.year, view.month, 1))}
          >
            ›
          </button>
        </div>

        <div className="nutrition-calendar" role="grid" aria-label={`Nutrition in ${monthName}`}>
          <div className="nutrition-calendar-row" role="row">
            {WEEKDAYS.map((name) => (
              <span key={name} className="calendar-head" role="columnheader" aria-label={name}>
                {name[0]}
              </span>
            ))}
          </div>
          {weeks.map((week, i) => (
            <div key={i} className="nutrition-calendar-row" role="row">
              {week.map((day, j) =>
                day === null ? (
                  <span key={j} role="gridcell" />
                ) : (
                  <span key={day.key} role="gridcell">
                    <button
                      type="button"
                      className={`nutrition-day band-${day.band}${day.key === selected ? ' selected' : ''}`}
                      aria-label={`${longDate(day.key)}, ${day.band === 'none' ? 'no food tracked' : `${formatNutritionAmount(day.calories)} calories, ${day.percent}% of goal`}`}
                      aria-pressed={day.key === selected}
                      aria-current={day.when === 'today' ? 'date' : undefined}
                      disabled={day.when === 'future'}
                      onClick={() => onSelect(day.key)}
                    >
                      <span>{day.day}</span>
                      {day.band !== 'none' && <small>{day.percent}%</small>}
                    </button>
                  </span>
                ),
              )}
            </div>
          ))}
        </div>

        <ul className="legend nutrition-legend" aria-label="Calorie goal colours">
          <li><span className="swatch band-low" />50% or less</li>
          <li><span className="swatch band-mid" />50–80%</li>
          <li><span className="swatch band-good" />80–95%</li>
          <li><span className="swatch band-target" />95–110%</li>
          <li><span className="swatch band-over" />Over 110%</li>
          <li><span className="swatch band-none" />No food tracked</li>
        </ul>
      </section>
    </div>
  );
}

export function NutritionScreen({ nutrition, saveFailed, onChange }: Props) {
  const [now] = useState(() => Date.now());
  const [showStats, setShowStats] = useState(false);
  const today = dateKey(now);
  const [selected, setSelected] = useState(today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [searchError, setSearchError] = useState('');
  const [addedFood, setAddedFood] = useState('');
  const searchController = useRef<AbortController | null>(null);
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

  useEffect(() => () => searchController.current?.abort(), []);

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    const query = search.trim();
    if (query.length < 2) return;
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    setSearchStatus('loading');
    setSearchError('');
    setAddedFood('');
    try {
      const results = await searchFoods(query, controller.signal);
      setSearchResults(results);
      setSearchedQuery(query);
      setSearchStatus('success');
    } catch (error) {
      if (controller.signal.aborted) return;
      setSearchResults([]);
      setSearchedQuery(query);
      setSearchError(error instanceof Error ? error.message : 'The food database is temporarily unavailable.');
      setSearchStatus('error');
    }
  }

  function logSearchResult(result: FoodSearchResult) {
    const entry = createFoodEntry(foodSearchResultDraft(result), newId());
    if (!entry) return;
    onChange(addFood(nutrition, today, entry));
    setAddedFood(result.name);
  }

  function logFood() {
    const entry = createFoodEntry({ name, calories, protein, fiber }, newId());
    if (!entry) return;
    onChange(addFood(nutrition, selected, entry));
    setName('');
    setCalories(undefined);
    setProtein(undefined);
    setFiber(undefined);
  }

  function addFoodToToday(food: (typeof foods)[number]) {
    onChange(addFood(nutrition, today, { ...food, id: newId() }));
  }

  function addDayToToday() {
    const next = foods.reduce((data, food) => addFood(data, today, { ...food, id: newId() }), nutrition);
    onChange(next);
  }

  if (showStats) return <NutritionStatsScreen nutrition={nutrition} now={now} onBack={() => setShowStats(false)} />;

  return (
    <main className="screen with-tabs nutrition-screen">
      <header className="bar">
        <div>
          <p className="eyebrow">Daily fuel</p>
          <h1>Nutrition</h1>
        </div>
      </header>
      {saveFailed && <p className="status error">Could not save to this device. Your latest changes may be lost.</p>}

      <button type="button" className="stats-button" onClick={() => setShowStats(true)}>
        <span>
          <strong>Nutrition stats</strong>
          <small>30-day averages and progress</small>
        </span>
        <span aria-hidden="true">›</span>
      </button>

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
      <button type="button" className="previous-days-button" onClick={() => setCalendarOpen(true)}>
        <span aria-hidden="true">▦</span>
        Previous days
      </button>

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
          <span className="data-source-badge">Open Food Facts</span>
        </div>
        <form className="food-search-form" onSubmit={submitSearch}>
          <input
            type="search"
            aria-label="Search the food database"
            placeholder="Search foods, meals or brands"
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <button type="submit" className="primary" disabled={search.trim().length < 2 || searchStatus === 'loading'}>
            {searchStatus === 'loading' ? 'Searching…' : 'Search'}
          </button>
        </form>

        <div className="food-search-status" aria-live="polite">
          {searchStatus === 'idle' && <p className="muted search-note">Tap Search when you are ready. Manual entry always remains available.</p>}
          {searchStatus === 'error' && <p className="status error">{searchError} You can still add the food manually below.</p>}
          {searchStatus === 'success' && searchResults.length === 0 && (
            <p className="muted search-note">No foods found for “{searchedQuery}”. Try a brand or a more general name.</p>
          )}
          {addedFood && <p className="status success">Added {addedFood} to today.</p>}
        </div>

        {searchResults.length > 0 && (
          <ul className="food-search-results" aria-label={`Food results for ${searchedQuery}`}>
            {searchResults.map((result) => (
              <li key={result.id}>
                {result.imageUrl ? <img src={result.imageUrl} alt="" loading="lazy" /> : <span className="food-image-placeholder" aria-hidden="true">◌</span>}
                <div className="food-result-copy">
                  <strong>{result.name}</strong>
                  {result.brand && <span className="muted">{result.brand}</span>}
                  <span className="food-result-basis">Per {result.basis}</span>
                  <div className="food-result-nutrients">
                    <span><strong>{formatNutritionAmount(result.calories)}</strong> kcal</span>
                    {result.protein !== undefined && <span><strong>{formatNutritionAmount(result.protein)}</strong> g protein</span>}
                    {result.carbohydrates !== undefined && <span>{formatNutritionAmount(result.carbohydrates)} g carbs</span>}
                    {result.fat !== undefined && <span>{formatNutritionAmount(result.fat)} g fat</span>}
                    {result.fiber !== undefined && <span>{formatNutritionAmount(result.fiber)} g fiber</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className="add-food-result"
                  aria-label={`Add ${result.name} to today`}
                  onClick={() => logSearchResult(result)}
                >
                  <span aria-hidden="true">+</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="food-data-note">
          Data from <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a>. Values are community-contributed; check the package label when accuracy matters.
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
        {selected < today && foods.length > 0 && (
          <button type="button" className="wide" onClick={addDayToToday}>
            Add this whole day to today
          </button>
        )}
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
                <div className="food-actions">
                  {selected < today && (
                    <button type="button" className="copy-food" onClick={() => addFoodToToday(food)}>
                      + Today
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon danger"
                    aria-label={`Remove ${food.name}`}
                    onClick={() => onChange(removeFood(nutrition, selected, food.id))}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {calendarOpen && (
        <PreviousDaysCalendar
          nutrition={nutrition}
          now={now}
          selected={selected}
          onSelect={(key) => {
            setSelected(key);
            setCalendarOpen(false);
            window.scrollTo(0, 0);
          }}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </main>
  );
}
