# R22 Home weekly averages: competitor comparison (report v1)

> **Reviewer notice.** The reviews in this study (R-001 to R-015) were made by
> **Claude**, the same model family as the researcher, not by an independent
> model. A Claude review tends to share the researcher's blind spots. Read
> "established" below as "checked by a second Claude session against its own
> fetches", not as independent verification, and weigh the findings
> accordingly.

Study: `research/r22-weekly-averages`, contract v1 (focused, after development).
Review rounds: one. All 15 claims got `established` in round 1, so there were
no responses and no round-2 reviews. Every statement below cites the claims
that support it. Statements marked *(reviewer note)* come from a review
comment and its reviewer evidence, not from a researcher claim.

## 1. The question

How do established fitness, nutrition and sleep apps present weekly average
sleep, average daily calories and the change from the previous week, and where
does our R22 implementation differ from common practice? (contract v1,
`objective`)

## 2. Competitors examined

All five allowed by `maxCompetitors`. Every competitor source is vendor
documentation or a vendor forum or blog. **Nothing was observed in a running
competitor app.**

| Competitor | Area | Claims |
| --- | --- | --- |
| Google Health (formerly the Fitbit app) | Sleep | C-001, C-002 |
| Oura | Sleep | C-003, C-004, C-005 |
| Cronometer | Calories | C-006, C-007 |
| MacroFactor | Calories | C-008, C-009, C-010 |
| Apple Health | Sleep | C-011 |
| gym-app (our R22, read from source) | Both | C-012, C-013, C-014 |
| Comparison (interpretation) | Calories | C-015 |

## 3. Established findings

All are `established` by the Claude reviewer (see the notice above).

### Sleep

- **Google Health** help says its weekly sleep view shows the hours slept each
  night of the week together with a weekly average (C-001). It also offers a
  "30 day average" comparison under the Sleep duration chart, which compares
  recent results with the past 30 days. No week-over-week comparison is
  described (C-002).
- **Oura**'s weekly report shows weekly average Readiness, Sleep and Activity
  *scores*. Total sleep time appears only as a trend chart, not as an average
  number of hours (C-003). The weekly report appears only if the ring was worn
  the previous night and for at least two weeks in total (C-004). In Oura's
  Trends Week view, the average shown beside a graph covers all of the
  member's data since the start, not the displayed week (C-005).
- **Apple Health**'s current support article describes the W view of the sleep
  chart as sleep history "for the past week". It does not mention a weekly
  average or a comparison with the previous week (C-011). The article not
  mentioning them does not show the app lacks them.

### Calories

- **Cronometer** lets the user choose whether nutrition trend averages include
  all days or exclude days with no data, according to 2018 and 2019 forum posts
  (C-006). *(Reviewer note, R-006:* a 2023 Cronometer blog post, reviewer
  evidence E-018, lists "All Days / Non-Empty Days / Complete Days" for the
  Nutrition Report, so the option seems to have still existed in 2023.) In
  2019 a Cronometer staff member said days that had some data but no food
  logged could not be excluded (C-007). Whether that changed later is unknown
  (R-007).
- **MacroFactor**'s Nutrition Overview shows calorie averages for the week,
  month, quarter or year *before the chosen day* (C-008). The wording suggests
  a window anchored on that day rather than a calendar week, but the page does
  not say so explicitly (C-008 limitations). Its Energy Balance widget shows
  the past month's average intake next to the average target or expenditure,
  with a signed "Difference" (C-009). It marks reaching the day's target by
  making the target line bolder, a cue tied to the target rather than to the
  direction of change (C-010).

### Our implementation (read from source at commit f046ac0)

- Sleep is averaged over the nights present in the sleep log, and calories over
  days with at least one food entry, within the Monday-to-Sunday local week
  (C-012). This matches R22.
- The week-over-week change is coloured only by its sign, green for an
  increase and red for a decrease, for both sleep and calories. No goal is
  taken into account (C-013). This matches R22 as written. *(Reviewer note,
  R-013:* a change below 0.005 is labelled "same" and shown in the muted
  colour. R22 does not describe this case.)
- The current week, which may be incomplete, is compared with the previous
  calendar week. Neither box shows how many days its average covers (C-014).

## 4. Contradicted or withdrawn claims

None. No claim was contradicted, marked needs-change, unknown or out of scope,
and none was withdrawn.

## 5. Unknowns (no fetched evidence; no claim made)

- **Week definition at competitors.** No source states which day a
  competitor's week starts on, or whether the week is a calendar week or the
  last 7 days. Google Health's "within this week" hints at a calendar week
  (R-001). MacroFactor's wording hints at a window anchored on a chosen day
  (C-008). Apple's "past week" is ambiguous (C-011).
- **How competitors show a week-over-week change.** No fetched source shows
  any competitor showing a change from the previous week, whether as an
  absolute value or a percentage, with arrows or colour. The only comparisons
  found are against a 30-day average (C-002), against all of the user's data
  (C-005), and against a target over a month (C-009). So we cannot say what
  "common practice" is for this dimension (C-015 limitations).
- **Colour of change.** No source shows how any competitor colours a change.
  MacroFactor's Difference has no documented colour (R-009).
- **Missing nights in sleep averages.** None of the three sleep apps documents
  how nights without data affect a weekly average (C-001, C-003, C-004
  limitations).
- **Defaults.** Cronometer's default day-inclusion option is not stated
  (C-006).
- **Placement and how quickly a summary can be read.** No evidence was
  gathered on this contract dimension for any competitor. No claims were made.
- **Observed behaviour.** Every competitor finding is documentation only. Our
  own findings come from source code and were not checked in a browser
  (C-012 to C-014 limitations).

## 6. Unresolved disagreements for the manager

None between researcher and reviewer. Two points need the manager's judgement
anyway:

1. **Independence.** All the agreement above comes from one model family (see
   the notice at the top). If this study will drive a requirement change,
   consider a Gemini review run or a manual spot check of the key sources
   first, especially C-006/C-007 (old forum posts) and C-008 to C-010.
2. **Colour by sign vs goal.** R22 deliberately specifies green for an increase
   and red for a decrease. C-015 (an interpretation) argues this can conflict
   with a user whose goal is to eat less. Whether that matters is a product
   decision, not a factual one.

## 7. Gaps in our implementation compared with what was found

These are differences from what the competitors document, not defects against
R22. Our code matches R22 as written (C-012, C-013).

- **Partial week compared with a full week.** We compare an incomplete current
  week with a full previous week and do not show the number of days covered
  (C-014). Of the competitors, Oura holds back its weekly report until it has
  enough data (C-004). *(Reviewer note, R-006/E-018:* Cronometer's blog
  suggests leaving out today while logging is unfinished, to keep averages
  accurate.) Neither of these is a direct match for our case.
- **Goal-blind calorie colour.** Our calorie change is coloured green for any
  increase (C-013). The calorie competitor whose cues we found relates intake to
  the user's target, not to the direction of change (C-009, C-010). This is an
  interpretation (C-015) based on one competitor.
- **No user choice of days to include.** We always omit days without food
  entries (C-012). Cronometer documents a user choice (C-006). Our rule is the
  same as Cronometer's "exclude empty days" option. We have no "all days"
  option.

Our rule of averaging over tracked days only is consistent with the options
documented by Cronometer (C-006, C-012). No other competitor documents its rule
for missing days (section 5).

## 8. Recommendations (advisory; the manager decides)

1. **Consider making the calorie change colour goal-aware, or neutral.** For
   example, colour by movement toward the calorie goal, or use a neutral colour
   for calories. Basis: C-013, C-015, C-009, C-010. Evidence strength: one
   competitor, interpretation only. This needs a change to the R22 text.
2. **Consider showing the days covered** (for example "4 nights") or otherwise
   flagging an incomplete current week, so a partial-week comparison is not
   misread. Basis: C-014. Supporting context: C-004 and the R-006 note. No
   competitor was found doing exactly this.
3. **Keep tracked-days-only averaging and the Monday-to-Sunday week.** No
   evidence contradicts them (C-006, C-012), but competitors' week definitions
   are unknown (section 5), so this is "no reason to change", not "common
   practice".
4. **Add the "same" (muted) state to the R22 text**, so the requirement matches
   the code. Basis: R-013 note. This is a documentation fix, not a study
   finding.
5. **Before acting on 1 or 2**, consider a follow-up with an independent
   reviewer, and hands-on observation of one or two competitor apps, to close
   the week-over-week display unknown (section 5).

## Possible future studies

- How competitors show progress toward a calorie or sleep goal over a week
  (target-based cues), a topic broader than week-over-week change.
