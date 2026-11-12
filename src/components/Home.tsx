// R13: the Home tab. It has no widgets yet. A later task adds one by putting
// an entry in HOME_WIDGETS; choosing and ordering them is also still to come.
import type { ReactNode } from 'react';
import type { Session } from '../lib/sessions';
import type { WeightUnit } from '../lib/storage';
import { displayName, type Workout } from '../lib/workouts';

/** What a widget is given to draw itself from. */
export interface HomeData {
  routines: Workout[];
  history: Session[];
  unit: WeightUnit;
}

export interface HomeWidget {
  id: string;
  title: string;
  render: (data: HomeData) => ReactNode;
}

export const HOME_WIDGETS: readonly HomeWidget[] = [];

interface Props {
  data: HomeData;
  active: Session | null;
  onResume: () => void;
  widgets?: readonly HomeWidget[];
}

export function Home({ data, active, onResume, widgets = HOME_WIDGETS }: Props) {
  return (
    <main className="screen with-tabs">
      <header className="bar">
        <h1>Home</h1>
      </header>

      {active && (
        <button type="button" className="banner" onClick={onResume}>
          <span>
            <strong>{displayName(active, 'Workout')}</strong> in progress
          </span>
          <span>Resume ›</span>
        </button>
      )}

      {widgets.length === 0 ? (
        <p className="empty">Nothing here yet. Widgets you choose will appear on this screen.</p>
      ) : (
        <ul className="cards">
          {widgets.map((widget) => (
            <li key={widget.id} className="card">
              <h2 className="section-title">{widget.title}</h2>
              {widget.render(data)}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
