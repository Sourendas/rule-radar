import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveZone, toUtc, formatInZone, offsetMinutes } from '../src/tz.js';
import { findDates, pickDeadline, checkEligibility, findRequirements, scanRules, toMarkdown, sentences, hashText } from '../src/scanner.js';
import { SAMPLE_RULES } from '../src/sample.js';

const iso = (ms) => new Date(ms).toISOString();

test('Eastern Time in late October is EDT (UTC-4)', () => {
  const u = toUtc({ y: 2026, mo: 10, d: 26, h: 17, mi: 0 }, resolveZone('Eastern Time'));
  assert.equal(iso(u), '2026-10-26T21:00:00.000Z');
  assert.equal(formatInZone(u, 'Asia/Kolkata'), 'Tue, 27 Oct 2026, 02:30');
});

test('Eastern Time after 1 Nov 2026 is EST (UTC-5)', () => {
  const u = toUtc({ y: 2026, mo: 12, d: 1, h: 17 }, resolveZone('ET'));
  assert.equal(iso(u), '2026-12-01T22:00:00.000Z');
});

test('fixed abbreviations and numeric offsets', () => {
  assert.equal(resolveZone('EDT').offset, -240);
  assert.equal(resolveZone('IST').offset, 330);
  assert.equal(resolveZone('UTC+5:30').offset, 330);
  assert.equal(resolveZone('GMT-3').offset, -180);
  assert.equal(resolveZone('Pacific Time').iana, 'America/Los_Angeles');
  assert.equal(resolveZone('nonsense'), null);
  assert.equal(offsetMinutes(Date.UTC(2026, 6, 1), 'America/Los_Angeles'), -420);
});

test('parses Devpost-style range and picks the end as deadline', () => {
  const t = 'Submission Period: September 22, 2026 (10:00 am Eastern Time) – October 26, 2026 (5:00 pm Eastern Time) ("Submission Period").';
  const d = findDates(t);
  assert.equal(d.length, 2);
  assert.deepEqual(d.map((x) => x.role), ['start', 'end']);
  assert.equal(iso(pickDeadline(d).utc), '2026-10-26T21:00:00.000Z');
});

test('parses "@ 5:00pm EDT", "21:00 UTC" and ISO dates', () => {
  assert.equal(iso(findDates('Deadline: Oct 26, 2026 @ 5:00pm EDT')[0].utc), '2026-10-26T21:00:00.000Z');
  assert.equal(iso(findDates('Submissions due 26 Oct 2026 21:00 UTC.')[0].utc), '2026-10-26T21:00:00.000Z');
  assert.equal(iso(findDates('Deadline 2026-11-02 23:59 IST')[0].utc), '2026-11-02T18:29:00.000Z');
});

test('12 am / 12 pm handling', () => {
  assert.equal(iso(findDates('Due January 5, 2027 12:00 am UTC')[0].utc), '2027-01-05T00:00:00.000Z');
  assert.equal(iso(findDates('Due January 5, 2027 12:00 pm UTC')[0].utc), '2027-01-05T12:00:00.000Z');
});

test('date without time or zone is flagged and defaults to 23:59 UTC', () => {
  const [d] = findDates('Submission deadline: March 3, 2027.');
  assert.equal(d.zoneStated, false);
  assert.equal(d.timeStated, false);
  assert.equal(iso(d.utc), '2027-03-03T23:59:00.000Z');
});

test('no dates -> no deadline', () => {
  assert.equal(scanRules('Be nice. Build something.', { homeZone: 'Asia/Kolkata' }).deadline, null);
});

test('sample rules: deadline shifts to next day in IST', () => {
  const r = scanRules(SAMPLE_RULES, { homeZone: 'Asia/Kolkata', country: 'India' });
  assert.equal(r.deadline.view.local, 'Sat, 14 Nov 2026, 06:30');
  assert.equal(r.deadline.view.abbr, 'IST');
  assert.equal(r.deadline.view.dayShift, true);
  assert.equal(r.dates.length, 7);
  assert.equal(r.eligibility.countryStatus, 'ok');
});

test('country exclusion, aliases, and no false positive from "laws of the United States"', () => {
  const t = 'The Hackathon IS NOT open to residents of a country where the laws of the United States prohibit participating (including Brazil, Quebec, Russia, Crimea, Cuba, Iran, and North Korea) or sanctioned by the U.S. Treasury.';
  assert.equal(checkEligibility(t, 'Brazil').countryStatus, 'excluded');
  assert.equal(checkEligibility(t, 'russia').countryStatus, 'excluded');
  assert.equal(checkEligibility(t, 'India').countryStatus, 'ok');
  assert.equal(checkEligibility(t, 'United States').countryStatus, 'ok');
  assert.equal(checkEligibility(t, 'USA').countryStatus, 'ok');
  assert.equal(checkEligibility(t, '').countryStatus, 'unset');
  assert.ok(checkEligibility(t, 'India').excluded.includes('North Korea'));
  assert.ok(!checkEligibility(t, 'India').excluded.includes('India'));
});

test('"India" does not match "Indiana"', () => {
  assert.equal(checkEligibility('Not open to residents of Indiana.', 'India').countryStatus, 'ok');
});

test('age rules', () => {
  assert.equal(checkEligibility('Ages 18+ only', '').age.min, 18);
  assert.equal(checkEligibility('You must be at least 16 years old.', '').age.min, 16);
  assert.ok(checkEligibility('at least the age of majority where they reside', '').majority);
});

test('requirements from sample rules', () => {
  const ids = findRequirements(SAMPLE_RULES).map((r) => r.id);
  for (const id of ['new-project', 'video', 'repo', 'license', 'files', 'description', 'english', 'media', 'purchase'])
    assert.ok(ids.includes(id), id);
  const v = findRequirements(SAMPLE_RULES).find((r) => r.id === 'video');
  assert.equal(v.label, 'Demo video under 3 min, public on YouTube or Vimeo');
});

test('required planning files are listed, SKILL.md is ignored', () => {
  const t = 'Any coding agent that uses the SKILL.md standard is fine. Your public repository must include the scope.md, prd.md, and spec.md files.';
  assert.equal(findRequirements(t).find((r) => r.id === 'files').label, 'Repo includes scope.md, prd.md, spec.md');
});

test('sentence splitting keeps "U.S. Treasury" together', () => {
  assert.equal(sentences('Sanctioned by the U.S. Treasury Office. Next one.').length, 2);
});

test('markdown export reflects ticks', () => {
  const r = scanRules(SAMPLE_RULES, { homeZone: 'Asia/Kolkata', country: 'India' });
  const md = toMarkdown(r, ['video']);
  assert.match(md, /\*\*Deadline:\*\* Sat, 14 Nov 2026, 06:30 IST/);
  assert.match(md, /- \[x\] Demo video/);
  assert.match(md, /- \[ \] Public code repository/);
});

test('hash is stable', () => {
  assert.equal(hashText('abc'), hashText('abc'));
  assert.notEqual(hashText('abc'), hashText('abd'));
});

test('date without year borrows the year from earlier dates and is flagged', () => {
  const t = 'Judging Period: October 27, 2026 (10:00 am Eastern Time).\nWinners Announced: On or around November 4th (2:00 pm Eastern Time).';
  const d = findDates(t);
  assert.equal(d.length, 2);
  assert.equal(d[1].yearInferred, true);
  assert.equal(d[1].label, 'Winners Announced');
  assert.equal(iso(d[1].utc), '2026-11-04T19:00:00.000Z');
});

test('lowercase "may" is not read as a month', () => {
  assert.equal(findDates('Entrants may 2 times resubmit. Deadline: March 3, 2027 5:00 pm UTC').length, 1);
});
