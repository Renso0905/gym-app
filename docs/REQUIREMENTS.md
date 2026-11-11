# Requirements

A personal gym-tracking app, installable on an iPhone as a progressive web app.
Each requirement has an id, and acceptance criteria that tests can check.

## Implemented

### R1 Valid sets
A weighted set records an exercise name, a rep count and a weight. Weights are
in the unit the user chose (lb or kg); the rules do not depend on which.
- A set is valid when the name is not blank, reps is a whole number above 0,
  and weight is a finite number of 0 or more (0 covers bodyweight exercises).
- Invalid sets are never displayed or counted.

### R2 Workout volume
The app shows the total training volume of a workout.
- Volume is the sum of reps x weight over the valid sets of weight-and-reps
  exercises, shown on each workout in the list.
- Invalid sets contribute nothing; an empty workout has volume 0.

### R7 Workout builder
Reusable workout plans, built and edited freely.
- Any number of workouts. Each has a name, notes and any number of exercises.
- Each exercise has a name, a measurement type (weight and reps, reps only,
  time, distance and time), optional rest time and notes, and any number of sets.
- Exercises can be added, removed, duplicated and moved up or down. Sets can be
  added and removed; a new set starts with the previous set's values.
- Workouts can be edited, duplicated and deleted. Deleting needs a second tap.
- Every change is saved to the device immediately and survives a reload. If the
  device refuses the save, the editor says so.
- Damaged or missing saved data never crashes the app; unusable parts are
  repaired or skipped.
- A new workout left completely empty is discarded.
- The weight unit (lb by default, or kg) is a display setting; switching it does
  not convert numbers already entered.

## Planned

- R3 Log a session: perform a saved workout and record what was actually done.
- R4 History: see past workouts by date.
- R5 Offline use: data stays on the device and the app works without a network.
- R6 Install to the iPhone home screen.

## Out of scope for now

Accounts, cloud sync, social features, and any server-side storage.
