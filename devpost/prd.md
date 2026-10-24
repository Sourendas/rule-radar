---
doc: prd
status: approved
---
<!-- Produced with the Devpost Learn Skill Pack (`3-prd`), 24 Oct 2026. Learner not live; decisions sourced from his written instructions and labeled. -->

# RuleRadar — Product Requirements

A single-page tool that turns pasted contest rules into a personal, timezone-correct deadline view, eligibility check and submission checklist, for solo builders outside the organizer's timezone.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. The entrant opens RuleRadar. The settings bar shows home timezone (pre-filled from the browser, e.g. Asia/Kolkata) and country (empty first time).
2. They paste the rules text into the big text box, or press **Load sample**.
3. They press **Scan rules** (or Ctrl+Enter).
4. **Deadline** card: the submission deadline in their timezone, original wording beside it, a live countdown, and a "next-day" badge when the local date differs from the organizer's date.
5. **Key dates** list: every other dated line (registration, judging, winners), each converted.
6. **Eligibility** panel: age rule; their country checked against the exclusion list (pass / excluded / no country set).
7. **Checklist**: requirements found in the text as tickable items, each with the source sentence on hover/expand.
8. They tick items as they finish them; reloading the page keeps the ticks for that rules text.
9. **Copy as Markdown** puts the checklist and deadline on the clipboard for notes.
Success = the deadline is right in their timezone and nothing disqualifying was missed. (`scope.md > What "Working" Looks Like`)

## Screens and Layout
One page. Header with name + settings (timezone select, country input). Left column: rules textarea with Load sample / Scan / Clear. Right column: Deadline card on top, then Eligibility, Key dates, Checklist. Stacks vertically on narrow screens.

## Look and Feel
Dark navy background, off-white text, one amber accent for urgent/deadline, green for pass, red for excluded/red-flags. System UI font, monospace for original quoted text. Calm, dense, no illustrations. (`scope.md > Inspiration & Identity`)

## Features and Behavior

### Deadline conversion
- As an entrant in India, I want the submission deadline in IST so that I don't miss it by a day.
  - [ ] "October 26, 2026 (5:00 pm Eastern Time)" with home zone Asia/Kolkata shows "Tue, 27 Oct 2026, 02:30" and IST label.
  - [ ] DST is respected (EDT −4 in October, EST −5 in December).
  - [ ] Supports ET/EST/EDT/Eastern Time, PT/PST/PDT/Pacific Time, CT/CST/CDT, MT, UTC/GMT/Z, IST, CET/CEST, BST, and numeric offsets like UTC+5:30.
  - [ ] Ranges ("Submission Period: A – B") use the end date as the deadline.
  - [ ] Countdown updates every second; after the deadline it says "closed".

### Eligibility check
- As an entrant, I want to know at a glance whether my country is excluded.
  - [ ] If the text lists excluded countries and mine is in it → red "Excluded" with the sentence.
  - [ ] If mine is not listed → green "Not in exclusion list" (with a "read the full rules" note).
  - [ ] Age requirement (e.g. "Ages 18+", "age of majority") is surfaced.

### Requirement checklist
- As an entrant, I want every required deliverable as a checkbox.
  - [ ] Detects: demo video (+ max minutes and hosting site), public repo, open-source license, required files (e.g. scope.md), new-project-only rule, text description, English language, team rules, "no purchase necessary".
  - [ ] Each item shows the sentence it came from.
  - [ ] Ticks persist per rules text in the browser.
  - [ ] "Copy as Markdown" copies deadline + checklist.

## States and Boundaries
- **First use** — empty textarea with hint and Load sample button; result panels show a short "paste rules to begin".
- **No dates found** — Deadline card says "No dated deadline found — check the rules page".
- **Date without zone** — converted assuming UTC and flagged "zone not stated".
- **Persistence** — settings and ticks in localStorage; nothing leaves the browser.

## Product Decisions
- Paste instead of URL fetch — reliable and works for any site (from scope cut).
- Rule-based, no AI model at runtime — free, instant, private, testable. (Agent recommendation, consistent with Souren's zero-spend rule.)
- Country check is advisory only — never claims legal eligibility.

## What We're Building
Deadline conversion with countdown, key dates, eligibility panel, requirement checklist with persistence, Markdown copy, sample rules.

## Deferred From the POC
URL fetching, .ics export, notifications, multiple saved contests, LLM fallback.

## Possible Later Enhancements
Browser extension that scans the open rules page; shared team checklist.

## Non-Goals
Not a legal reviewer; not a contest directory; no accounts.

## Open Questions
None blocking.
