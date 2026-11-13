# Architecture

React, TypeScript and Vite, built as a static site with no backend.

## Layers

| Path | Contains | May import |
| --- | --- | --- |
| `src/lib/` | Domain logic: routines, sessions, exercise library, volume, save format | Nothing from React |
| `src/state/` | React hooks that connect the logic to device storage | `src/lib`, React |
| `src/components/` | Screens and controls | `src/lib`, React |
| `src/App.tsx` | Chooses the screen and wires changes to state | Everything above |

The `src/lib` rule is enforced by the factory policy check through
`factory.config.json`. Domain logic is plain TypeScript so every rule in
`REQUIREMENTS.md` can be unit tested without a browser.

## Testing

Vitest, with test files next to the code as `*.test.ts`. The acceptance
criteria of each requirement map to tests in `src/lib`.

## Quality control

`.github/workflows/ci.yml` only calls the central factory
(`Renso0905/ai-factory`, tag `v1`). Checks are added there, not here.

## Data and privacy

All personal tracking data is stored on the device only, in the browser's
localStorage. Food search terms are sent through the same-origin search
function to Open Food Facts; workouts, sleep and nutrition logs are not.

| Key | Holds |
| --- | --- |
| `gym.workouts.v1` | Routines, as `{ version, workouts }` |
| `gym.sessions.v1` | Finished sessions, as `{ version, sessions }` |
| `gym.active.v1` | The session in progress, or null |
| `gym.exercises.v1` | Custom exercises |
| `gym.unit.v1` | `lb` or `kg` |
| `gym.sleep.v1` | Hours slept, as `{ version, nights }` with one `YYYY-MM-DD: hours` entry per night |
| `gym.nutrition.v1` | Nutrition goals and daily food entries, as `{ version, goals, days }` keyed by `YYYY-MM-DD` |

`src/lib/storage.ts` owns the formats; loading repairs or skips damaged data.
Change the key or bump the version when a format changes incompatibly.

## External food data

`src/lib/food-search.ts` owns the read-only Open Food Facts integration. Search
is user-submitted rather than search-as-you-type because the public endpoint is
rate-limited. The client requests only product identity, serving, image and
nutrition fields; every response is treated as untrusted, validated and
deduplicated before components receive it. No API key or account is stored.

During local development, Vite exposes the same-origin `/api/food-search` route
and makes an identified server-side request to Open Food Facts. It uses the
global search host first and retries the US host once after a server failure.
This avoids browser CORS and anonymous-bot blocking on phone previews.
Production and local builds both call the same-origin endpoint. Cloudflare
Pages serves `functions/api/food-search.ts` in production; Vite supplies the
equivalent middleware locally. Both validate the query, control upstream
parameters and identify the app before calling the global host with one US-host
retry after server failures.

The search prefers per-serving nutrition, calculates it from per-100g values
when a serving quantity is available, and otherwise labels values per 100g.
Search results are converted into ordinary nutrition drafts and logged directly
to today. Manual entry remains the offline and service-failure fallback.

## Deployment and offline shell

Cloudflare Pages builds `main` with `npm run build` and publishes `dist`.
The root `functions/` directory supplies the Pages Function; `public/_routes.json`
keeps all static traffic out of the function. Account connection, production
deployment approval and Cloudflare Access policy changes are owner-only steps
documented in `docs/DEPLOYMENT.md`. No credentials are stored in the repo.

The build generates `dist/sw.js` from the final hashed assets. It precaches the
app shell, uses a navigation network-first fallback, caches same-origin static
assets and always leaves `/api/` requests on the network. Old Gym Tracker
caches are removed when a new service worker activates.

## Decisions

- A routine and a session share one shape (`Plan`: an ordered list of exercises
  with sets), so one set of editing functions in `src/lib/workouts.ts` serves
  both. Session-only rules are in `src/lib/sessions.ts`.
- All rules are pure functions that return new values, so components stay thin
  and the rules are unit tested.
- An exercise in a routine or session keeps the library id it came from
  (`defId`). "Last time" is found by that id, so it works across routines.
- The built-in exercise list is written for this app in `src/lib/exercises.ts`;
  it is not copied from another app or dataset.
- No automated UI tests yet. Screens are checked by hand in a phone-sized
  browser; add component tests when UI regressions start to cost time.
- Plain CSS in `src/styles.css`, no UI library. Controls are at least 44px tall
  and use 16px text so iOS does not zoom on focus.
- Weights are unit-neutral numbers; lb or kg is only a label.
- Progress statistics (`src/lib/progress.ts`) are recalculated from the history
  each time; nothing derived is saved, so there is no second copy to go stale.
  Dates use the device's local time and weeks start on Monday.
- Charts are small hand-written SVG components (`src/components/Charts.tsx`),
  one series each, so no chart library is needed.
- Home renders the `HOME_WIDGETS` list in `src/components/Home.tsx`. A widget is
  an id, a title and a render function given Home data and actions. The first
  widget is the workout launcher; its routine fallback rule is in `src/lib/home.ts`.
- Root tab labels and order live in `src/lib/navigation.ts`. Workout progress
  is a view opened from Workouts, not a separate root tab.
- Sleep is keyed by local calendar day (`YYYY-MM-DD`), not by a timestamp, so
  an entry stays on its day when the time zone or clock changes.
- Nutrition entries use the same local calendar-day keys as sleep. Calorie,
  protein and fiber totals are derived from food entries rather than saved, so
  removing or repairing an entry cannot leave stale totals behind.
- Sleep and nutrition statistics use rolling local-day windows and are derived
  on demand from those logs. Missing days are omitted from averages and charts;
  they are not interpreted as zero sleep or zero food.
- The manifest, generated service worker and committed app icons make the
  production build installable and keep its non-network features available
  offline after the first successful load.
- Backup files are versioned JSON snapshots. Restore passes every value through
  the existing tolerant storage parsers before replacing in-memory state.
