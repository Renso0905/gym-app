# Requirements

A personal gym-tracking app, installable on an iPhone as a progressive web app.
Each requirement has an id, and acceptance criteria that tests can check.

## Implemented

### R1 Valid sets
A set records an exercise name, a rep count and a weight in kilograms.
- A set is valid when the name is not blank, reps is a whole number above 0,
  and weight is a finite number of 0 or more (0 covers bodyweight exercises).
- Invalid sets are never displayed or counted.

## Planned

- R2 Workout volume: total of reps x weight across the valid sets of a workout.
- R3 Log a workout: add, edit and remove sets for today.
- R4 History: see past workouts by date.
- R5 Offline use: data stays on the device and the app works without a network.
- R6 Install to the iPhone home screen.

## Out of scope for now

Accounts, cloud sync, social features, and any server-side storage.
