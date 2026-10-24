# RuleRadar

**Contest rules, read from your side of the world.**

Paste a hackathon's official rules and RuleRadar shows you:

- **The submission deadline in your timezone**, with a live countdown and a warning when the date changes in your zone (e.g. *Mon 5:00 pm EDT* → *Tue 02:30 IST*). DST-aware.
- **An eligibility check for you**: is your country in the exclusion list? What age rule applies?
- **A submission checklist** pulled from the text (video length and host, public repo, license, required files, new-project-only, English, …). Every item links to the sentence it came from. Ticks are saved in your browser.
- **Every other key date** (registration, judging, winners) converted too.
- **Copy as Markdown** for your notes.

Everything runs in the browser. No server, no account, no API key, nothing uploaded.

> RuleRadar highlights clauses; it is not legal advice. Always read the full rules.

## Run it

Any static file server works:

```bash
python3 -m http.server 8080     # or: npx serve .
# open http://localhost:8080
```

Press **Load sample** to try the fictional *Northwind Open Build Challenge* rules, or paste any rules page (Ctrl+A, Ctrl+C on the rules page, then paste).

## Test

Requires Node.js 18+ (uses the built-in test runner, no dependencies):

```bash
npm test
```

17 tests cover: ET/EDT/EST across the Nov 1 DST switch, fixed abbreviations and `UTC+5:30` offsets, Devpost-style date ranges, `@ 5:00pm EDT`, `21:00 UTC`, ISO dates, 12 am/pm, missing time/zone, country exclusions and aliases (no false positive from "laws of the United States", "India" ≠ "Indiana"), age rules, requirement extraction, Markdown export.

## How it works

| File | What it does |
|---|---|
| `src/tz.js` | Maps zone words (ET, Eastern Time, EDT, PT, UTC+5:30, IST, CET…) to IANA zones or fixed offsets; converts wall-clock times to UTC with `Intl` (no date library). |
| `src/scanner.js` | Pure functions: `findDates`, `pickDeadline`, `checkEligibility`, `findRequirements`, `scanRules`, `toMarkdown`. |
| `src/app.js` | Renders the cards, runs the countdown, saves settings and ticks in `localStorage`. |
| `src/sample.js` | Fictional sample rules for the demo. |

Extraction is rule-based (regular expressions + the browser's timezone database), so it is instant, free and private, and it can miss unusual wording. Dates need a year; a date with no zone is treated as UTC and flagged.

## Built with the Devpost Learn Skill Pack

Planned and built for **Build With AI: Basics** (Devpost, Oct 2026) using the [Devpost Learn Skill Pack](https://github.com/challengepost/learn-ai-basics) (`npx skills add challengepost/learn-ai-basics --all -y`). The planning documents the skills produced are in [`devpost/`](devpost/): [`scope.md`](devpost/scope.md), [`prd.md`](devpost/prd.md), [`spec.md`](devpost/spec.md), the build [`checklist.md`](devpost/checklist.md) and an [`app-map.html`](devpost/app-map.html) code map.

## Roadmap

URL fetch for rules pages, `.ics` calendar export, reminders, several saved contests side by side, optional AI pass for unusual wording.

## License

MIT, see [LICENSE](LICENSE).
