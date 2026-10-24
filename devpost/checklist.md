---
doc: checklist
status: approved
---
<!-- Produced with the Devpost Learn Skill Pack (`5-build`), 24 Oct 2026. Fast mode. -->

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Paste rules and see the deadline converted to your timezone**
  Becomes usable: `scanRules()` turns pasted text into dated items with the submission deadline in the home zone; verified from Node.
  Why now: The kernel (timezone-correct deadline) and the riskiest part (DST + zone words) come first.
  PRD ref: `prd.md > Deadline conversion`
  Spec ref: `spec.md > Timezone helper (src/tz.js)`, `spec.md > Scanner (src/scanner.js)`
  Build: `src/tz.js` zone aliases and two-pass IANA conversion; `findDates` for "Month D, YYYY (h:mm am Zone)", "D Month YYYY hh:mm Zone", ISO; ranges; `pickDeadline`.
  Verify (mechanical): `npm test` — EDT/EST tests, Devpost-style range, "@ 5:00pm EDT", "21:00 UTC", ISO, 12 am/pm, missing zone.
  Learner check: Paste "Submission Period: September 22, 2026 (10:00 am Eastern Time) – October 26, 2026 (5:00 pm Eastern Time)" with Asia/Kolkata and see Tue, 27 Oct 2026, 02:30 IST.
  Commit: `Scanner: dates to home timezone, eligibility check, requirement checklist (+17 tests)`

- [x] **2. Eligibility and checklist from the same text**
  Becomes usable: Country exclusion check, age rule and requirement checklist with source sentences.
  Why now: Second half of the kernel — "what could disqualify me".
  PRD ref: `prd.md > Eligibility check`, `prd.md > Requirement checklist`
  Spec ref: `spec.md > Scanner (src/scanner.js)`
  Build: `checkEligibility` (Intl.DisplayNames country list, aliases, strip "laws of the United States"), `findRequirements` rules table.
  Verify (mechanical): `npm test` — exclusion/alias/Indiana tests, age tests, requirement tests; real Devpost rules page text scanned from Node (India ok, Brazil excluded, US ok).
  Learner check: Set country to Italy with the sample loaded; Country turns red.
  Commit: (same commit as slice 1)

- [x] **3. The page: cards, countdown, ticks that persist, Markdown copy**
  Becomes usable: Full single-page app in the browser.
  Why now: Turns the engine into the product experience shown in the demo.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Screens and Layout`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > UI (index.html, src/app.js, styles.css)`, `spec.md > Data Model`
  Build: settings bar (timezone select, country datalist), textarea + Load sample/Scan/Clear, Deadline/Eligibility/Checklist/Key dates cards, localStorage.
  Verify (mechanical): Headless Chrome (timezone Asia/Kolkata) loads page with zero console errors; screenshots show all cards; ticks survive reload.
  Learner check: Load sample, tick two items, reload, ticks are still there.
  Commit: `UI: deadline card with countdown, eligibility panel, checklist with saved ticks, key dates, Markdown copy`

## Final Review
- [x] Kernel verified on the real Build With AI rules page: deadline shows Tue, 27 Oct 2026, 02:30 IST with the date-change badge.
- [x] Fix during review: sentence splitter broke "U.S. Treasury" into two sentences, which made a US entrant look excluded. Fixed with an abbreviation guard; test added.
- [x] Fix during review: video length lived in a separate bullet ("less than three (3) minutes"); now read from nearby sentences; test added.

## Code Tour and App Map
- [x] Recap route (fast mode): `devpost/app-map.html` follows one action — press **Scan rules** → `src/app.js run()` → `src/scanner.js scanRules()` → `src/tz.js toUtc()` → `render()` deadline card.

## Revisions
- Normalize the browser's legacy `Asia/Calcutta` zone name to `Asia/Kolkata` in the settings bar.
