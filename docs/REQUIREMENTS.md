# Requirements

A personal gym-tracking app, installable on an iPhone as a progressive web app.
Each requirement has an id, and acceptance criteria that tests can check.

The model follows apps such as Hevy and Caliber: a **routine** is the reusable
outline of a workout, and a **session** is that workout performed on a given
day with the actual numbers filled in.

## Implemented

### R1 Valid sets
A weighted set records an exercise name, a rep count and a weight. Weights are
in the unit the user chose (lb or kg); the rules do not depend on which.
- A set is valid when the name is not blank, reps is a whole number above 0,
  and weight is a finite number of 0 or more (0 covers bodyweight exercises).
- Invalid sets are never counted.

### R2 Workout volume
- Volume is the sum of reps x weight over the valid sets of weight-and-reps
  exercises. It is shown for each finished session.

### R7 Routines
The outline of a workout, built and edited freely.
- Any number of routines. Each has a name, notes and any number of exercises.
- Exercises are added from the exercise library (R8). Each has any number of
  sets, optional target numbers per set, optional rest time and notes.
- Exercises can be removed, duplicated and moved up or down. Sets can be added
  and removed; a new set starts with the previous set's values.
- Routines can be edited, duplicated and deleted. Deleting needs a second tap.
- Every change is saved to the device immediately and survives a reload. If the
  device refuses the save, the screen says so.
- Damaged or missing saved data never crashes the app; unusable parts are
  repaired or skipped.
- A new routine left completely empty is discarded.
- The weight unit (lb by default, or kg) is a display setting; switching it does
  not convert numbers already entered.

### R8 Exercise library
- A built-in list of at least 150 common exercises, each with a muscle group,
  equipment and a measurement type (weight and reps, reps only, time, or
  distance and time).
- Adding exercises opens a full-screen picker. Search matches every word typed
  against the name, muscle group and equipment; names starting with the query
  come first. Muscle group and equipment filters narrow the list.
- Several exercises can be selected and added in one go.
- A custom exercise can be created from the picker, pre-filled with the search
  text. Names must be unique. Custom exercises are saved and searchable.

### R3 Log a session
- A session starts from a routine, copying its exercises and target numbers, or
  starts empty. Editing a session never changes the routine.
- Only one session can be in progress. It is saved continuously and can be
  resumed after closing the app.
- Each set shows what was done for that position the last time the same
  exercise was logged, in any session. Tapping it copies the numbers in.
- A set is ticked when done. Ticking a set with no numbers fills it from last
  time. Numbers already entered are never overwritten.
- Exercises and sets can be added, removed and reordered during a session.
- Finishing saves only the ticked sets, with the date and duration. A session
  with no ticked set cannot be finished; it can be discarded with a second tap.

### R4 History
- Finished sessions are listed newest first with date, duration, set count and
  volume.
- A session can be opened to see every logged set, and deleted with a second tap.

## Planned

- R5 Offline use: the app loads without a network (service worker).
- R6 Install to the iPhone home screen (needs deployment).
- R9 Rest timer between sets.
- R10 Progress per exercise: personal records and charts.
- R11 Edit a finished session.
- R12 Update a routine from a finished session.

## Out of scope for now

Accounts, cloud sync, social features, exercise videos, and any server-side
storage.
