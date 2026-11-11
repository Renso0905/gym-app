# Architecture

React, TypeScript and Vite, built as a static site with no backend.

## Layers

| Path | Contains | May import |
| --- | --- | --- |
| `src/lib/` | Domain logic: sets, workouts, calculations | Nothing from React |
| `src/` (components) | UI | `src/lib`, React |

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

Workout data will be stored on the device only (R5). Nothing is sent to a
server.

## Deployment

Not built yet. When added, the deploy job must target the `production`
GitHub environment, which requires approval from the repository owner.

## Decisions

- No UI test tooling yet; added when there is UI behaviour worth testing.
- The web manifest exists, but there is no service worker until R5.
