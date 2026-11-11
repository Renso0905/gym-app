# Architecture

React, TypeScript and Vite, built as a static site with no backend.

## Layers

| Path | Contains | May import |
| --- | --- | --- |
| `src/lib/` | Domain logic: workouts, sets, volume, save format | Nothing from React |
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

Workout data is stored on the device only, in the browser's localStorage under
`gym.workouts.v1` as `{ version, workouts }`. Nothing is sent to a server.
`src/lib/storage.ts` owns the format; loading repairs or skips damaged data.
Change the key or bump the version when the format changes incompatibly.

## Deployment

Not built yet. When added, the deploy job must target the `production`
GitHub environment, which requires approval from the repository owner.

## Decisions

- All editing rules are pure functions in `src/lib/workouts.ts` that return new
  values, so components stay thin and the rules are unit tested.
- No automated UI tests yet. Screens are checked by hand in a phone-sized
  browser; add component tests when UI regressions start to cost time.
- Plain CSS in `src/styles.css`, no UI library. Controls are at least 44px tall
  and use 16px text so iOS does not zoom on focus.
- Weights are unit-neutral numbers; lb or kg is only a label.
- The web manifest exists, but there is no service worker until R5.
