// RuleRadar scanner: pure functions that read pasted contest rules and return
// dates (converted to UTC), the submission deadline, an eligibility check and a requirement checklist.
import { resolveZone, toUtc, formatInZone, zoneAbbr, dateKey } from './tz.js';

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const MON = '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\.?';
const ZONE = '((?:UTC|GMT)\\s*[+\\-−]\\s*\\d{1,2}(?::?\\d{2})?|(?:Eastern|Central|Mountain|Pacific)(?:\\s+(?:Standard|Daylight))?(?:\\s+Time)?|India(?:n)?\\s+Standard\\s+Time|Coordinated\\s+Universal\\s+Time|Greenwich\\s+Mean\\s+Time|E[SD]T|C[SD]T|M[SD]T|P[SD]T|ET|CT|MT|PT|UTC|GMT|IST|CEST|CET|BST|SGT|JST|AEDT|AEST|Z)\\b';
const TIME = '(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?';
const GAP = '[\\s,]*(?:\\(|@|at\\b|,)?\\s*';
// Month D, YYYY | D Month YYYY | YYYY-MM-DD, then optional time and zone.
const DATE_RE = new RegExp(
  `(?:${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(\\d{4}))?|(\\d{1,2})(?:st|nd|rd|th)?\\s+${MON},?\\s+(\\d{4})|(\\d{4})-(\\d{2})-(\\d{2}))` +
  `(?:(?:${GAP}|T)${TIME}(?![\\d/])(?:\\s*\\(?\\s*${ZONE})?)?(?:\\s*\\(?\\s*${ZONE})?`,
  'gi');

export function sentences(text) {
  return String(text || '')
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/(?<![A-Z]\.[A-Z]\.)(?<!\b(?:e\.g|i\.e|etc|No|St|Mr|Ms|Dr)\.)(?<=[.!?;])\s+(?=[A-Z(•\-*])/))
    .map((s) => s.replace(/^[\s•*\-–#]+/, '').trim())
    .filter(Boolean);
}

function tidy(raw) {
  let o = raw.trim().replace(/[\s(,@]+$/, '');
  if (o.includes('(') && !o.includes(')')) o += ')';
  return o;
}

function kindOf(s) {
  if (/submission|deadline|due\b|submit/i.test(s)) return 'submission';
  if (/registration|register|sign[- ]?up/i.test(s)) return 'registration';
  if (/judging|evaluation/i.test(s)) return 'judging';
  if (/winners?|announce/i.test(s)) return 'winners';
  return 'other';
}

/** Find every dated mention. Each: {label, kind, utc, zoneLabel, zoneStated, timeStated, original, role} */
export function findDates(text, { now = Date.now() } = {}) {
  const out = [];
  let lastYear = null;
  for (const s of sentences(text)) {
    const found = [];
    DATE_RE.lastIndex = 0;
    let m;
    while ((m = DATE_RE.exec(s))) {
      let y, mo, d, yearInferred = false;
      if (m[1]) {
        mo = MONTHS[m[1].slice(0, 3).toLowerCase()]; d = +m[2];
        if (m[3]) y = +m[3];
        else {
          // "November 4th" with no year: only trust a capitalised month, then borrow the year from earlier dates.
          if (!/^[A-Z]/.test(m[1]) || d < 1 || d > 31) continue;
          y = lastYear || new Date(now).getUTCFullYear();
          yearInferred = true;
        }
      }
      else if (m[4]) { d = +m[4]; mo = MONTHS[m[5].slice(0, 3).toLowerCase()]; y = +m[6]; }
      else { y = +m[7]; mo = +m[8]; d = +m[9]; }
      let h = m[10] != null ? +m[10] : null;
      const mi = m[11] != null ? +m[11] : 0;
      const ap = m[12] ? m[12].replace(/\./g, '').toLowerCase() : null;
      // A bare number without colon or am/pm is not a time (e.g. "2026 10").
      if (h != null && m[11] == null && !ap) h = null;
      if (h != null && ap === 'pm' && h < 12) h += 12;
      if (h != null && ap === 'am' && h === 12) h = 0;
      const zTok = m[13] || m[14] || null;
      const zone = resolveZone(zTok);
      const timeStated = h != null;
      const parts = { y, mo, d, h: timeStated ? h : 23, mi: timeStated ? mi : 59 };
      if (!yearInferred) lastYear = y;
      found.push({
        yearInferred,
        utc: toUtc(parts, zone || { offset: 0 }),
        zoneLabel: zone ? zone.label : 'UTC (assumed)',
        zoneStated: !!zone, timeStated,
        sourceDate: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        original: tidy(m[0]),
        index: m.index, end: m.index + m[0].length,
      });
    }
    if (!found.length) continue;
    const before = s.slice(0, found[0].index).replace(/[:\-–—(@,\s]+$/, '').replace(/\s*\b(on or around|on or before|on|by|before|until|at)$/i, '').replace(/[:\s]+$/, '').trim();
    const label = (before || s).slice(0, 80);
    const kind = kindOf(s);
    found.forEach((f, i) => {
      let role = 'single';
      if (found.length >= 2) {
        const between = i > 0 ? s.slice(found[i - 1].end, f.index) : '';
        const next = found[i + 1] ? s.slice(f.end, found[i + 1].index) : '';
        if (/^\s*\)?\s*(–|—|-|to|through|until)\s*$/i.test(next)) role = 'start';
        else if (/^\s*\)?\s*(–|—|-|to|through|until)\s*$/i.test(between)) role = 'end';
      }
      const { index, end, ...rest } = f;
      out.push({ label, kind, role, sentence: s, ...rest });
    });
  }
  return out;
}

/** The submission deadline: latest end/single date of a submission-kind line. */
export function pickDeadline(dates) {
  const cands = dates.filter((d) => d.kind === 'submission' && d.role !== 'start');
  if (!cands.length) return null;
  const best = cands.reduce((a, b) => (b.utc > a.utc ? b : a));
  return best;
}

// ISO 3166 alpha-2 codes; names come from Intl.DisplayNames.
const CODES = 'AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ');
const EXTRA = ['Crimea', 'Quebec', 'Puerto Rico', 'Donetsk', 'Luhansk', 'Burma'];
const ALIASES = {
  'united states': ['united states', 'usa', 'u.s.a.', 'us', 'u.s.', 'america'],
  'united kingdom': ['united kingdom', 'uk', 'u.k.', 'great britain', 'britain', 'england'],
  'south korea': ['south korea', 'republic of korea'],
  'north korea': ['north korea', 'dprk'],
  'russia': ['russia', 'russian federation'],
  'myanmar (burma)': ['myanmar', 'burma'],
  'czechia': ['czechia', 'czech republic'],
  'türkiye': ['turkey', 'türkiye'],
  'india': ['india', 'bharat'],
};
let NAMES = null;
export function countryNames() {
  if (NAMES) return NAMES;
  let dn = null;
  try { dn = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { /* old runtime */ }
  NAMES = [...new Set([...CODES.map((c) => (dn ? dn.of(c) : c)), ...EXTRA])].sort();
  return NAMES;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function variants(country) {
  const c = country.trim().toLowerCase();
  for (const [k, list] of Object.entries(ALIASES)) if (k === c || list.includes(c)) return [k, ...list];
  return [c];
}
function mentions(sentence, country) {
  return variants(country).some((v) => {
    if (v.length <= 3 && !v.includes('.')) return new RegExp(`\\b${esc(v.toUpperCase())}\\b`).test(sentence);
    return new RegExp(`(^|[^\\p{L}])${esc(v)}($|[^\\p{L}])`, 'iu').test(sentence);
  });
}
// Remove references that name a country without excluding it ("laws of the United States", "U.S. Treasury").
function stripNonExclusions(s) {
  return s
    .replace(/\b(laws?|treasury|government|office|department|state)\s+of\s+(the\s+)?([A-Z][\w.]*\s?)+/g, ' ')
    .replace(/\bU\.?S\.?\s+(Treasury|law|laws|government|dollars?|USD)\b/gi, ' ')
    .replace(/\b(USD|US\$)\b/g, ' ');
}
const EXCL_RE = /(not open to|is not open|are not eligible|ineligible|excluding|exclud|prohibit|void where|except(?:ion|ing)?\b|sanction)/i;

export function checkEligibility(text, country) {
  const ss = sentences(text);
  const exclSentences = ss.filter((s) => EXCL_RE.test(s));
  const excluded = [];
  for (const s of exclSentences) {
    const clean = stripNonExclusions(s);
    for (const n of countryNames()) if (mentions(clean, n) && !excluded.includes(n)) excluded.push(n);
  }
  let age = null;
  for (const s of ss) {
    const m = s.match(/ages?\s*(\d{2})\s*\+|at least (?:the age of )?(\d{2})(?: years)?|(\d{2}) years (?:of age )?or older|(\d{2})\+ only/i);
    if (m) { age = { min: +(m[1] || m[2] || m[3] || m[4]), sentence: s }; break; }
  }
  const majority = ss.find((s) => /age of majority/i.test(s)) || null;
  let countryStatus = 'unset', countrySentence = null;
  if (country && country.trim()) {
    const hit = exclSentences.find((s) => mentions(stripNonExclusions(s), country));
    countryStatus = hit ? 'excluded' : 'ok';
    countrySentence = hit || null;
  }
  return { age, majority, excluded, countryStatus, countrySentence, exclusionSentences: exclSentences };
}

const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const REQS = [
  { id: 'register', kind: 'task', re: /\bregister\b|join hackathon|registration period/i, label: () => 'Register for the contest on its website' },
  { id: 'new-project', kind: 'flag', re: /newly created|new projects? only|\bnew (software )?project\b|started from an empty folder|old code is not/i,
    label: () => 'New project only — built during the submission period (disclose any pre-existing code)' },
  { id: 'video', kind: 'task', re: /\bvideo\b/i, label: (ss, ctx) => {
    const all = ss.join(' ');
    const lenText = all + ' ' + (ctx || []).filter((x) => /minutes?/i.test(x) && /(less than|under|no (?:more|longer) than|up to|maximum|\d+\s*(?:to|-|–)\s*\d+)/i.test(x)).join(' ');
    const mm = lenText.match(/(?:less than|under|no (?:more|longer) than|up to|maximum of|max(?:imum)?)\s+(\d+|one|two|three|four|five)\s*(?:\(\d\)\s*)?minutes?/i)
      || lenText.match(/(\d+)\s*(?:to|-|–)\s*(\d+)\s*minutes?/i);
    let len = '';
    if (mm) len = mm[2] ? ` (${mm[1]}–${mm[2]} min)` : ` under ${NUM[mm[1].toLowerCase()] || mm[1]} min`;
    const hosts = ['YouTube', 'Vimeo', 'Youku', 'Facebook Video'].filter((h) => new RegExp(h, 'i').test(all));
    return `Demo video${len}${hosts.length ? `, public on ${hosts.join(' or ')}` : ''}`;
  } },
  { id: 'repo', kind: 'task', re: /(github|gitlab|bitbucket|code repository|public repo)/i, label: (ss) => {
    const all = ss.join(' ');
    const hosts = ['GitHub', 'GitLab', 'Bitbucket'].filter((h) => new RegExp(h, 'i').test(all));
    return `${/public/i.test(all) ? 'Public ' : ''}code repository${hosts.length ? ` (${hosts.join(', ')})` : ''}`;
  } },
  { id: 'license', kind: 'task', re: /open source license|license file|\bMIT\b|Apache 2/i, label: () => 'Open-source license file in the repo' },
  { id: 'files', kind: 'task', re: /\b(must|include|required|requirements?)\b.*\b[\w-]+\.(md|txt|pdf|json|ipynb)\b|\b[\w-]+\.(md|txt|pdf|json|ipynb)\b.*\b(must|include|required)\b/i,
    label: (ss) => {
      const files = [...new Set(ss.flatMap((s) => (s.match(/\b[\w-]+\.(?:md|txt|pdf|json|ipynb)\b/gi) || [])))]
        .filter((f) => !/^skill\.md$/i.test(f));
      return files.length ? `Repo includes ${files.join(', ')}` : null;
    } },
  { id: 'description', kind: 'task', re: /text description|short description|written description/i, label: () => 'Text description of what it does' },
  { id: 'english', kind: 'task', re: /\bEnglish\b/, label: () => 'All materials in English (or with an English translation)' },
  { id: 'media', kind: 'flag', re: /copyrighted music|third[- ]party trademarks?/i, label: () => 'No copyrighted music or third-party trademarks in the video' },
  { id: 'testing', kind: 'task', re: /free of charge.*(testing|judging)|login credentials|testing instructions/i, label: () => 'Keep the project free and testable until judging ends' },
  { id: 'purchase', kind: 'info', re: /no purchase|no payment/i, label: () => 'No purchase or payment necessary to enter' },
  { id: 'age-box', kind: 'task', re: /age of majority/i, label: () => 'Confirm you are of the age of majority where you live' },
];

export function findRequirements(text) {
  const ss = sentences(text);
  const out = [];
  for (const r of REQS) {
    const hits = ss.filter((s) => r.re.test(s));
    if (!hits.length) continue;
    const label = r.label(hits, ss);
    if (!label) continue;
    out.push({ id: r.id, kind: r.kind, label, source: hits[0], sources: hits.slice(0, 3) });
  }
  return out;
}

export function hashText(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export function describe(d, homeZone) {
  if (!d) return null;
  return {
    local: formatInZone(d.utc, homeZone),
    abbr: zoneAbbr(d.utc, homeZone),
    dayShift: dateKey(d.utc, homeZone) !== d.sourceDate,
  };
}

export function scanRules(text, { homeZone = 'UTC', country = '' } = {}) {
  const dates = findDates(text);
  const deadline = pickDeadline(dates);
  return {
    hash: hashText(text || ''),
    dates: dates.map((d) => ({ ...d, view: describe(d, homeZone) })),
    deadline: deadline ? { ...deadline, view: describe(deadline, homeZone) } : null,
    eligibility: checkEligibility(text, country),
    requirements: findRequirements(text),
    homeZone, country,
  };
}

export function toMarkdown(result, ticked = []) {
  const L = ['# RuleRadar checklist', ''];
  if (result.deadline) {
    const v = result.deadline.view;
    L.push(`**Deadline:** ${v.local} ${v.abbr} (${result.homeZone}) — original: "${result.deadline.original}"`, '');
  }
  const e = result.eligibility;
  if (result.country) L.push(`**Country (${result.country}):** ${e.countryStatus === 'excluded' ? 'EXCLUDED' : 'not in exclusion list'}`);
  if (e.age) L.push(`**Age:** ${e.age.min}+`);
  L.push('');
  for (const r of result.requirements) {
    if (r.kind === 'info') L.push(`- ℹ️ ${r.label}`);
    else L.push(`- [${ticked.includes(r.id) ? 'x' : ' '}] ${r.label}${r.kind === 'flag' ? ' ⚠️' : ''}`);
  }
  return L.join('\n') + '\n';
}
