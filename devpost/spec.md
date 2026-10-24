---
doc: spec
status: approved
---
<!-- Produced with the Devpost Learn Skill Pack (`4-spec`), 24 Oct 2026. -->

# RuleRadar — Technical Spec

## How This Works, In Plain Language
RuleRadar is one web page. Everything happens in the browser: a small JavaScript "scanner" reads the pasted text line by line, finds dates with their timezones, phrases about eligibility, and phrases about deliverables. A "timezone helper" converts each found date to the user's home zone using the browser's built-in timezone database (Intl), so daylight saving is handled correctly with no library. The page then draws the cards. Ticks are saved in the browser's local storage. No server, no API key, no AI model at runtime — which keeps it free, private and instant.

## The Core Journey Through the System
Paste text → `app.js` calls `scanRules(text, {homeZone, country})` in `scanner.js` → scanner splits sentences, `findDates()` returns `{label, utc, sourceZone, original}` items using `tz.js` `toUtc()` → `pickDeadline()` chooses the submission end date → `checkEligibility()` and `findRequirements()` return items → `app.js` renders cards, starts the countdown, restores ticks from localStorage key `rr:ticks:<hash of text>`.
PRD ref: `prd.md > The Core Journey`.

## Stack
- Plain HTML, CSS, ES modules (no framework, no build step). Reason: tiny POC, deploys anywhere as static files.
- `Intl.DateTimeFormat` for zone math (MDN: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat).
- Tests: Node.js ≥ 18 built-in `node:test` (https://nodejs.org/api/test.html). No dependencies.

## Where It Runs and How Someone Tries It
Browser. Locally: `npx serve .` or `python3 -m http.server 8080`, open http://localhost:8080. Tests: `npm test`. Optional static deploy (Vercel / GitHub Pages). Demo video recorded from the local page.

## Look and Feel
Navy `#0b1426` background, panels `#13213d`, text `#e8eefc`, amber `#ffb020` accent, green `#2ecc71`, red `#ff5d5d`. System UI font; monospace for quotes. Dense two-column layout.

## Components

### Timezone helper (`src/tz.js`)
`ZONES` alias map (ET→America/New_York, EDT→fixed −4, …), `offsetMinutes(utcMs, ianaZone)`, `toUtc(parts, zoneToken)`, `formatInZone(utcMs, zone)`.
PRD ref: `prd.md > Deadline conversion`.

### Scanner (`src/scanner.js`)
`findDates(text)`, `pickDeadline(dates)`, `checkEligibility(text, country)`, `findRequirements(text)`, `scanRules(text, opts)`.
PRD ref: `prd.md > Features and Behavior`.

### UI (`index.html`, `src/app.js`, `styles.css`)
Settings, textarea, cards, countdown, ticks, copy as Markdown.
PRD ref: `prd.md > Screens and Layout`, `prd.md > States and Boundaries`.

## Data Model
- `rr:settings` → `{homeZone, country}` in localStorage.
- `rr:ticks:<hash>` → array of checked item ids, hash = FNV-1a of the rules text.
- Scan result (in memory): `{deadline, dates[], eligibility{age, countryStatus, excluded[]}, requirements[]}`.

## File Structure
```
rule-radar/
├── index.html          # page shell
├── styles.css
├── src/
│   ├── tz.js           # zone aliases + conversion
│   ├── scanner.js      # pure extraction logic (also used by tests)
│   ├── sample.js       # fictional sample rules text
│   └── app.js          # DOM rendering, countdown, storage
├── test/scanner.test.js
├── devpost/            # scope, prd, spec, checklist, app-map
├── package.json        # "test": "node --test"
├── LICENSE (MIT)
└── README.md
```

## External Services and Dependencies
None at runtime. Fonts are system fonts.

## Important Failure Modes
- **Unusual date wording** → line is skipped; Deadline card says no deadline found and shows "check the rules page".
- **Date with no zone** → treated as UTC with a "zone not stated" badge.
- **Country spelled differently** → simple aliases (USA/US/United States, UK/United Kingdom); otherwise "not in list" with advisory note.

## What Was Simplified and Why
- **Regex rules** instead of an LLM — free, deterministic, testable; an LLM fallback would need a key and network.
- **Paste** instead of URL fetch — avoids CORS/scraping.

## Decisions and Open Issues
- Rule-based extraction chosen by agent recommendation in line with the zero-spend rule.
- Uncertainty investigated: whether "Eastern Time" in late October is EDT (−4) — confirmed by a test (US DST ends 1 Nov 2026).
