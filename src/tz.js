// Timezone helper: maps zone words found in rules text to IANA zones or fixed offsets,
// and converts wall-clock times to UTC using the runtime's Intl timezone database.

// Fixed-offset abbreviations (minutes east of UTC).
const FIXED = {
  UTC: 0, GMT: 0, Z: 0, UT: 0,
  EDT: -240, EST: -300, CDT: -300, CST: -360, MDT: -360, MST: -420, PDT: -420, PST: -480,
  IST: 330, CET: 60, CEST: 120, BST: 60, WAT: 60, EAT: 180, SGT: 480, JST: 540, AEST: 600, AEDT: 660,
};

// Region words that follow daylight saving: resolve through IANA.
const REGION = [
  [/^(et|eastern(\s+(standard|daylight))?(\s+time)?)$/i, 'America/New_York'],
  [/^(ct|central(\s+(standard|daylight))?(\s+time)?)$/i, 'America/Chicago'],
  [/^(mt|mountain(\s+(standard|daylight))?(\s+time)?)$/i, 'America/Denver'],
  [/^(pt|pacific(\s+(standard|daylight))?(\s+time)?)$/i, 'America/Los_Angeles'],
  [/^(india(n)?\s+standard\s+time)$/i, 'Asia/Kolkata'],
  [/^(coordinated\s+universal\s+time|universal\s+time)$/i, 'UTC'],
  [/^(greenwich\s+mean\s+time)$/i, 'UTC'],
];

/** Resolve a zone token. Returns {iana} or {offset} (minutes) or null. */
export function resolveZone(token) {
  if (!token) return null;
  const t = token.trim().replace(/[().]/g, '').replace(/\s+/g, ' ');
  const m = t.match(/^(?:UTC|GMT)\s*([+-−])\s*(\d{1,2})(?::?(\d{2}))?$/i);
  if (m) {
    const sign = m[1] === '+' ? 1 : -1;
    return { offset: sign * (Number(m[2]) * 60 + Number(m[3] || 0)), label: t.toUpperCase() };
  }
  const up = t.toUpperCase();
  if (up in FIXED) return { offset: FIXED[up], label: up };
  for (const [re, iana] of REGION) if (re.test(t)) return { iana, label: t };
  if (/^[A-Za-z]+\/[A-Za-z_]+$/.test(t)) return { iana: t, label: t };
  return null;
}

/** Offset in minutes of an IANA zone at a given UTC instant. */
export function offsetMinutes(utcMs, iana) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: iana, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

/** Convert wall-clock parts in a zone to a UTC timestamp (ms). */
export function toUtc({ y, mo, d, h = 0, mi = 0 }, zone) {
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  if (!zone) return wall;
  if ('offset' in zone) return wall - zone.offset * 60000;
  // Two-pass guess handles DST boundaries.
  let guess = wall - offsetMinutes(wall, zone.iana) * 60000;
  guess = wall - offsetMinutes(guess, zone.iana) * 60000;
  return guess;
}

/** Format a UTC instant in a zone, e.g. "Tue, 27 Oct 2026, 02:30". */
export function formatInZone(utcMs, iana) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: iana, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`;
}

/** Short zone name for display, e.g. "IST" / "GMT+5:30". */
export function zoneAbbr(utcMs, iana) {
  if (iana === 'Asia/Kolkata' || iana === 'Asia/Calcutta') return 'IST';
  const p = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'short' })
    .formatToParts(new Date(utcMs)).find((x) => x.type === 'timeZoneName');
  return p ? p.value : iana;
}

/** Calendar date (YYYY-MM-DD) of an instant in a zone. */
export function dateKey(utcMs, iana) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: iana, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(utcMs));
}
