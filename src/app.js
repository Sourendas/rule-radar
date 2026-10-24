import { scanRules, toMarkdown, countryNames } from './scanner.js';
import { SAMPLE_RULES } from './sample.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

const rawZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const browserZone = rawZone === 'Asia/Calcutta' ? 'Asia/Kolkata' : rawZone;
const settings = store.get('rr:settings', { homeZone: browserZone, country: '' });
let current = null, timer = null;

function initSettings() {
  const zones = (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [browserZone, 'UTC', 'Asia/Kolkata']);
  if (!zones.includes(settings.homeZone)) zones.unshift(settings.homeZone);
  $('#tz').innerHTML = zones.map((z) => `<option${z === settings.homeZone ? ' selected' : ''}>${esc(z)}</option>`).join('');
  $('#countries').innerHTML = countryNames().map((c) => `<option value="${esc(c)}">`).join('');
  $('#country').value = settings.country;
  const save = () => { settings.homeZone = $('#tz').value; settings.country = $('#country').value.trim(); store.set('rr:settings', settings); if (current) run(); };
  $('#tz').addEventListener('change', save);
  $('#country').addEventListener('change', save);
}

function countdown(utc) {
  const el = $('#countdown');
  if (!el) return;
  const ms = utc - Date.now();
  if (ms <= 0) { el.textContent = 'Closed'; el.classList.add('closed'); return; }
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  el.textContent = `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s left`;
}

function render(r) {
  const ticks = store.get(`rr:ticks:${r.hash}`, []);
  const out = [];
  // Deadline
  if (r.deadline) {
    const d = r.deadline, v = d.view;
    out.push(`<div class="panel deadline" id="card-deadline"><h2>Submission deadline · your time</h2>
      <div class="big">${esc(v.local)}<span class="zone">${esc(v.abbr)}</span>
      ${v.dayShift ? '<span class="badge b-amber">DATE CHANGES IN YOUR ZONE</span>' : ''}
      ${!d.zoneStated ? '<span class="badge b-red">ZONE NOT STATED — UTC ASSUMED</span>' : ''}
      ${!d.timeStated ? '<span class="badge b-red">TIME NOT STATED — 23:59 ASSUMED</span>' : ''}</div>
      <div class="orig">Rules say: <q>${esc(d.original)}</q> · ${esc(r.homeZone)}</div>
      <div class="countdown" id="countdown"></div></div>`);
  } else {
    out.push(`<div class="panel deadline"><h2>Submission deadline</h2><div class="big warn">No dated deadline found</div><div class="orig">Check the rules page for the submission end date.</div></div>`);
  }
  // Eligibility
  const e = r.eligibility;
  const cStat = e.countryStatus === 'excluded' ? `<span class="bad">✕ ${esc(r.country)} is excluded</span>`
    : e.countryStatus === 'ok' ? `<span class="ok">✓ ${esc(r.country)} not in exclusion list</span>`
      : '<span class="warn">Set your country above</span>';
  const ageTxt = e.age ? `${e.age.min}+` : e.majority ? 'Age of majority' : 'Not stated';
  out.push(`<div class="panel" id="card-elig"><h2>Eligibility · for you</h2><div class="elig" style="margin-top:10px">
    <div class="cell"><div class="k">Country</div><div class="v">${cStat}</div></div>
    <div class="cell"><div class="k">Age</div><div class="v">${esc(ageTxt)}</div></div></div>
    ${e.excluded.length ? `<div class="chips"><span class="chip" style="border:0;padding-left:0">Excluded in text:</span>${e.excluded.map((c) => `<span class="chip${e.countryStatus === 'excluded' && e.countrySentence && c.toLowerCase() === r.country.toLowerCase() ? ' me' : ''}">${esc(c)}</span>`).join('')}</div>` : ''}
    ${e.countrySentence ? `<details style="margin-top:8px"><summary class="orig">Why</summary><div class="src">${esc(e.countrySentence)}</div></details>` : ''}</div>`);
  // Checklist
  const tasks = r.requirements.filter((q) => q.kind !== 'info');
  const done = tasks.filter((q) => ticks.includes(q.id)).length;
  out.push(`<div class="panel" id="card-check"><div class="panel-head"><h2>Submission checklist</h2><button id="copy" type="button" class="ghost">Copy as Markdown</button></div>
    <div class="orig" id="prog-txt">${done} of ${tasks.length} done</div><div class="progress"><i id="prog" style="width:${tasks.length ? (100 * done / tasks.length) : 0}%"></i></div>
    <ul class="check">${r.requirements.map((q) => `<li class="${q.kind}${ticks.includes(q.id) ? ' done' : ''}" data-id="${q.id}">
      ${q.kind === 'info' ? '<span style="width:18px">ℹ️</span>' : `<input type="checkbox" ${ticks.includes(q.id) ? 'checked' : ''} aria-label="${esc(q.label)}">`}
      <div><div class="lbl">${esc(q.label)}${q.kind === 'flag' ? ' <span class="badge b-amber">WATCH</span>' : ''}</div>
      <details><summary>source</summary><div class="src">${q.sources.map(esc).join('<br>')}</div></details></div></li>`).join('')}</ul></div>`);
  // Other dates
  const others = r.dates.filter((d) => d !== r.deadline && !(r.deadline && d.utc === r.deadline.utc && d.kind === r.deadline.kind));
  if (others.length) out.push(`<div class="panel" id="card-dates"><h2>Key dates · your time</h2><table class="dates" style="margin-top:8px">${others.map((d) => `<tr>
    <td class="l">${esc(d.label)}${d.role === 'start' ? ' — opens' : d.role === 'end' ? ' — closes' : ''}</td>
    <td class="t">${esc(d.view.local)} ${esc(d.view.abbr)}${d.view.dayShift ? '<span class="badge b-amber">+1 DAY</span>' : ''}</td>
    <td class="orig">${esc(d.original)}</td></tr>`).join('')}</table></div>`);
  $('#results').innerHTML = out.join('');

  $('#card-check').addEventListener('change', (ev) => {
    const li = ev.target.closest('li'); if (!li) return;
    const set = new Set(store.get(`rr:ticks:${r.hash}`, []));
    ev.target.checked ? set.add(li.dataset.id) : set.delete(li.dataset.id);
    store.set(`rr:ticks:${r.hash}`, [...set]);
    li.classList.toggle('done', ev.target.checked);
    const n = tasks.filter((q) => set.has(q.id)).length;
    $('#prog').style.width = `${tasks.length ? 100 * n / tasks.length : 0}%`;
    $('#prog-txt').textContent = `${n} of ${tasks.length} done`;
  });
  $('#copy').addEventListener('click', async () => {
    const md = toMarkdown(r, store.get(`rr:ticks:${r.hash}`, []));
    try { await navigator.clipboard.writeText(md); toast('Checklist copied as Markdown'); }
    catch { window.prompt('Copy the checklist:', md); }
  });
  clearInterval(timer);
  if (r.deadline) { countdown(r.deadline.utc); timer = setInterval(() => countdown(r.deadline.utc), 1000); }
}

function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

function run() {
  const text = $('#rules').value;
  store.set('rr:last', text);
  if (!text.trim()) { $('#results').innerHTML = '<div class="panel empty"><p>Paste a rules page (or load the sample) and press <b>Scan rules</b>.</p></div>'; current = null; clearInterval(timer); return; }
  current = scanRules(text, { homeZone: settings.homeZone, country: settings.country });
  render(current);
}

initSettings();
$('#scan').addEventListener('click', run);
$('#sample').addEventListener('click', () => { $('#rules').value = SAMPLE_RULES; run(); });
$('#clear').addEventListener('click', () => { $('#rules').value = ''; run(); });
$('#rules').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(); });
const last = store.get('rr:last', '');
if (last) { $('#rules').value = last; run(); }
window.__rr = { run, get current() { return current; } };
