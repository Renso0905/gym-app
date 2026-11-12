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
- Each exercise has an options menu (the ⋯ button) to replace it, move it up or
  down, duplicate it or delete it. Replacing keeps the position and number of
  sets; numbers are kept only when both exercises are measured the same way.
- Sets can be added and removed; a new set starts with the previous set's values.
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

### R16 History lives in Progress
- The tab bar has five tabs: Home, Routines, Progress, Nutrition and Sleep. History is not
  a tab.
- Progress shows a History section with the number of finished workouts and
  the date of the latest one. Opening it shows the History list (R4), which
  goes back to Progress.
- A workout opened from the list goes back to the list. Finishing a workout
  shows its detail with Progress as the selected tab, so going back leads
  through History to Progress.

### R12 Keep the routine in step
- When a finished session differs in structure from its routine, the app lists
  the differences and asks whether to update the routine or keep it as it was.
  The session is saved either way.
- Differences are: an exercise added, skipped or replaced; a different number of
  sets for an exercise, including planned sets left unticked; a different order.
- Different weights, reps, times or distances alone do not trigger the question.
- Updating makes the routine match the session: exercises, order, set counts and
  the numbers lifted. The routine keeps its name and notes.

### R13 Home tab
- Home is the first tab in the tab bar, and the app opens on it.
- A workout in progress can be resumed from it.
- Home draws a list of widgets, so a widget can be added without restructuring
  the screen. Choosing and arranging widgets is planned (R14).

### R19 Home workout launcher
A workout card on Home starts a routine without visiting the Routines tab.
- The card selects the first routine by default and shows its name, exercise
  count and up to four exercise names.
- Swap workout opens the routine choices and changes the card without editing
  any routine. If the chosen routine is later removed, the first remaining one
  is selected.
- Start workout begins the selected routine using the same session behavior as
  the Routines tab. It is disabled while another workout is in progress; the
  existing resume banner remains available.
- With no routines, the card explains what is needed and opens the Routines tab.

### R10 Progress
Statistics calculated from the finished sessions; nothing extra is stored.
- A period (4 weeks, 3 months, 1 year or all time) applies to the totals and
  the muscle-group figures. A period covers today and the days before it.
- Totals: workouts, total time, average workout length, sets, reps, volume and
  workouts per week. The weekly average is measured from the first workout ever
  logged when that is more recent than the start of the period.
- Weekly streaks: the current and the longest run of consecutive weeks (Monday
  to Sunday) with at least one workout. The current streak still counts when
  this week has no workout yet but last week had one.
- Charts of volume per week and workouts per week over the last 12 weeks.
- Sets per muscle group, most trained first. The group comes from the exercise
  library; exercises not found there count as "Other".
- Every exercise logged is listed, most recently performed first, with the
  number of workouts and sets. Opening one shows its personal records and a
  chart of its best value in each workout.
- Records, by how the exercise is measured:
  - Weight and reps: estimated one-rep max, heaviest weight, best set volume,
    best session volume, most reps in a set. The chart shows the estimated
    one-rep max.
  - Reps only: most reps in a set and in a session.
  - Time: longest time, and most time in a session.
  - Distance and time: longest distance, best pace (least time per unit of
    distance), and most distance in a session.
- The estimated one-rep max uses the Epley formula, weight x (1 + reps / 30);
  a single rep counts as the weight itself.
- A record is dated to the workout that first reached it.
- Sets without usable numbers count as sets but never in volume, records or
  charts.
- With no finished workouts the tab explains what will appear.

### R15 Sleep tracker
One number per night: the hours slept, filed under the day you woke up.
- A Sleep tab, last in the tab bar, shows a month calendar with weeks starting
  on Monday. It opens on the current month with today marked and selected.
  Earlier months can be browsed; months after the current one cannot.
- Each day is a circle. Today and earlier days can be selected to enter, change
  or clear the hours, by typing or in half-hour steps. Days after today cannot.
- Hours are from 0 to 24, rounded to the quarter hour. Clearing the number
  removes the entry.
- Circle colours: grey when an earlier day has no entry; red under 6 hours;
  yellow from 6 up to 7; green from 7 up to 8; turquoise at 8 or more. A
  boundary belongs to the band above it, so exactly 7 hours is green.
- A tracked day also shows its hours, and a legend explains the colours.
- The month shows how many nights were tracked and their average.
- Entries are saved to the device immediately and survive a reload. Damaged
  entries are skipped. If the device refuses the save, the screen says so.

### R17 Calorie and macro tracker
A daily food log with one set of goals shared across days.
- Nutrition is a tab between Progress and Sleep. It opens on today and can
  browse earlier days, but not future days.
- A calorie goal is always set and defaults to 2,000 kcal. Protein and fiber
  goals are optional. Goals accept positive numbers and are saved immediately.
- A food has a name, calories and optional protein and fiber amounts. It can be
  added manually to the selected day or removed from that day's log.
- The day shows calorie progress and the amount remaining or over goal. Protein
  and fiber totals are shown with progress when their goals are set.
- A Previous days button opens a Monday-first month calendar. Days without food
  are grey. Tracked days are red at 50% or less of the calorie goal, yellow
  above 50% and below 80%, green from 80% up to 95%, turquoise from 95% through
  110%, and red again when over 110%.
- Selecting today or an earlier calendar day opens its food log. From an earlier
  day, one food or the whole day can be copied into today's log without changing
  the original entries.
- Food search queries Open Food Facts only when Search is submitted. Results
  show their serving basis, calories, protein and any available fiber,
  carbohydrate and fat values. Each result has a plus button that logs it
  directly to today; the manual-entry form remains separate.
- Search validates and deduplicates returned products, credits the community
  data source, and explains failures without blocking manual entry. It never
  searches on every keystroke, so it respects the public service's rate limit.
- Goals and food logs are saved to the device immediately and survive a reload.
  Damaged days or entries are skipped. If the device refuses the save, the
  screen says so.

### R18 Sleep and nutrition statistics
Dedicated 30-day summaries calculated from existing on-device logs.
- A Sleep stats button appears above the sleep calendar. Its view shows nights
  tracked, average and longest sleep, the share of tracked nights with at least
  seven hours, and a line graph of nightly sleep in calendar order.
- A Nutrition stats button appears above the nutrition day controls. Its view
  shows days tracked, average calories, average protein and fiber, the share of
  tracked days from 95% through 110% of the calorie goal, and a line graph of
  daily calories with the current goal drawn as a reference line.
- Both views cover today and the previous 29 days. Missing days are omitted
  rather than treated as zero, and an empty view explains how to begin.

## Planned

- R5 Offline use: the app loads without a network (service worker).
- R6 Install to the iPhone home screen (needs deployment).
- R9 Rest timer between sets.
- R11 Edit a finished session.
- R14 Home widgets: choose, arrange and customise what Home shows.

## Out of scope for now

Accounts, cloud sync, social features, exercise videos, and any server-side
storage.
