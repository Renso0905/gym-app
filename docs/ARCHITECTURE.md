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

All data is stored on the device only, in the browser's localStorage. Nothing
is sent to a server.

| Key | Holds |
| --- | --- |
| `gym.workouts.v1` | Routines, as `{ version, workouts }` |
| `gym.sessions.v1` | Finished sessions, as `{ version, sessions }` |
| `gym.active.v1` | The session in progress, or null |
| `gym.exercises.v1` | Custom exercises |
| `gym.unit.v1` | `lb` or `kg` |

`src/lib/storage.ts` owns the formats; loading repairs or skips damaged data.
Change the key or bump the version when a format changes incompatibly.

## Deployment

Not built yet. When added, the deploy job must target the `production`
GitHub environment, which requires approval from the repository owner.

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
- Home renders the `HOME_WIDGETS` list in `src/components/Home.tsx`, which is
  empty for now. A widget is an id, a title and a render function.
- The web manifest exists, but there is no service worker until R5.
