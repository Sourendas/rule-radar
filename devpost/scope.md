---
doc: scope
status: approved
---
<!-- Planning provenance: produced with the Devpost Learn Skill Pack (`2-scope`) on 24 Oct 2026.
     The learner (Souren) was not live in chat; answers come from his written standing instructions.
     Approval here = the agent's checkpoint; Souren reviews before submitting. -->

# RuleRadar

Paste a hackathon's official rules and get every deadline in *your* timezone, a pass/fail eligibility check for *you*, and a tick-off submission checklist.

## The Unique Kernel
Contest rules are written for the organizer's timezone and country. RuleRadar reads the rules from the entrant's side: it turns "October 26, 2026 (5:00 pm Eastern Time)" into "Tue 27 Oct, 02:30 IST — in 2 days 17 h" and flags the clauses that can silently disqualify *this* person (excluded country, age, new-project-only, video limit, required files).

## Who It's For
A solo builder outside the US — like Souren in India — who enters several Devpost-style contests a month. Today he reads each rules page, converts ET/EDT/UTC to IST in his head or in a search box, and keeps requirements in scattered notes. Off-by-one-day mistakes across midnight IST are the real risk.

## The Core Loop
Open RuleRadar → paste the rules text (or load the sample) → set home timezone and country once → read the deadline cards and red flags → tick checklist items as they get done → come back to it before the deadline; ticks are remembered.

## Inspiration & Identity
A calm "radar" dashboard: dark navy, one amber accent for urgent items, green/red for pass/fail. Fast, no sign-up, works offline.

## Why This Matters to the Learner
Every contest brief he writes contains a manual ET→IST conversion; one wrong conversion can mean a missed prize.

## What "Working" Looks Like
Paste real rules text → within a second see: the submission deadline converted to IST with a live countdown, other key dates (registration, judging, winners), an eligibility panel that says "India: not excluded", and a checklist containing items like "Demo video under 3 minutes, on YouTube or Vimeo" and "Repo includes scope.md, prd.md, spec.md". The "oh, that's cool" beat: the 5 pm EDT Monday deadline shows up as 02:30 IST *Tuesday*, with the date change flagged.

## The POC Boundary
- Paste text in; no URL fetching.
- Rule-based extraction (dates + zones, eligibility, requirements) running in the browser.
- Timezone and country settings; checklist with ticks saved in the browser.
- Copy checklist as Markdown.

## Later
- Fetch a rules page by URL.
- Optional LLM pass for odd wording.
- Calendar (.ics) export and reminder notifications.
- Multiple saved contests side by side.

## Explicitly Cut
- Accounts / cloud sync — not needed to prove the kernel; localStorage is enough.
- Scraping Devpost — terms and CORS make it fragile; paste is reliable.
- Legal advice — RuleRadar highlights clauses, it never decides eligibility for you.
