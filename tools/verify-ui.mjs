#!/usr/bin/env node
// NurseLingua UI verification.
//
// Walks every route in headless Chrome against the real API and fails on:
//   - emoji or dingbat glyphs used as icons   (SVG icons only)
//   - em dashes in user-visible copy
//   - pill-shaped buttons (fully rounded buttons wider than they are tall)
//   - purple hues in computed styles
//   - red console errors, HTTP >= 400, or a blank/white screen
//   - a missing skip link or <main id="main"> landmark
//
// Usage (with the API and the dev server already running):
//   npm run verify:ui
//   APP_URL=http://localhost:5173 API_URL=http://localhost:8081 node tools/verify-ui.mjs
//
// Requires Chrome. Exits 1 when anything fails, so it can gate a deploy.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const APP = process.env.APP_URL ?? 'http://localhost:5173';
const API = process.env.API_URL ?? 'http://localhost:8081';
const EMAIL = 'ui.verify@example.com';
const TOKEN = `dev.${encodeURIComponent(EMAIL)}`;
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!CHROME) {
  console.error('Chrome not found. Set CHROME_PATH to the Chrome/Chromium binary.');
  process.exit(2);
}

// ---------- fixtures: a conversation that actually has turns ----------
let conv = { id: '' };
try {
  await fetch(`${API}/api/v1/onboarding`, { method: 'POST', headers: H,
    body: JSON.stringify({ nurseLanguage: 'en', patientLanguages: ['es', 'hi'], speechRate: 'slow', retention: '7days' }) });
  conv = await (await fetch(`${API}/api/v1/conversations`, { method: 'POST', headers: H,
    body: JSON.stringify({ patientLanguage: 'es' }) })).json();
  const phrases = await (await fetch(`${API}/api/v1/phrases?lang=es`, { headers: H })).json();
  await fetch(`${API}/api/v1/conversations/${conv.id}/turns`, { method: 'POST', headers: H,
    body: JSON.stringify({ speaker: 'NURSE', phraseId: phrases[0].id }) });
  await fetch(`${API}/api/v1/conversations/${conv.id}/turns`, { method: 'POST', headers: H,
    body: JSON.stringify({ speaker: 'PATIENT', text: 'Me duele aquí desde esta mañana.', sttConfidence: 0.92 }) });
} catch (e) {
  console.error(`Could not build the API fixture. Is the backend running at ${API}? (${e.message})`);
  process.exit(2);
}

// ---------- in-page audit ----------
const AUDIT = `(() => {
  const text = document.getElementById('root')?.innerText ?? '';
  const picto = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2190}-\\u{21FF}\\u{2500}-\\u{257F}\\u{25A0}-\\u{25FF}\\u{2B00}-\\u{2BFF}]/gu;
  const pills = [];
  for (const el of document.querySelectorAll('button, a, .chip')) {
    const cs = getComputedStyle(el); const r = parseFloat(cs.borderTopLeftRadius);
    const b = el.getBoundingClientRect();
    if (r > 0 && b.height > 0 && r >= b.height / 2 - 0.5 && b.width > b.height + 2)
      pills.push((el.className || el.tagName) + ' r=' + cs.borderTopLeftRadius);
  }
  const purple = new Set();
  const hue = (r, g, b) => { const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn;
    if (!d) return -1; let h; if (mx === r) h = ((g-b)/d) % 6; else if (mx === g) h = (b-r)/d + 2; else h = (r-g)/d + 4;
    return (h*60+360)%360; };
  for (const el of document.querySelectorAll('*')) { const cs = getComputedStyle(el);
    for (const p of ['color','backgroundColor','borderTopColor']) {
      const m = cs[p].match(/rgba?\\((\\d+), (\\d+), (\\d+)/); if (!m) continue;
      const r = +m[1], g = +m[2], b = +m[3];
      if (Math.max(r,g,b) - Math.min(r,g,b) < 30 || Math.max(r,g,b) < 50) continue;
      const H = hue(r,g,b); if (H >= 245 && H <= 320) purple.add(p + ':' + cs[p]); } }
  return JSON.stringify({ path: location.pathname, chars: text.trim().length,
    emoji: [...new Set(text.match(picto) ?? [])], emDash: (text.match(/\\u2014/g) ?? []).length,
    pills: pills.slice(0, 3), purple: [...purple].slice(0, 3),
    svgIcons: document.querySelectorAll('svg').length, imgTags: document.querySelectorAll('img').length,
    skipLink: !!document.querySelector('a.skip-link[href="#main"]'), mainId: !!document.getElementById('main') });
})()`;

const ROUTES = ['/', '/terms', '/privacy', '/sign-in', '/sign-up', '/interpreter',
  '/home', '/phrasebook', '/history', '/settings', '/conversation', `/conversation/${conv.id}`];

// ---------- drive Chrome over CDP ----------
const profile = mkdtempSync(join(tmpdir(), 'nl-verify-'));
const port = 9600 + Math.floor(Math.random() * 300);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function devtools(p) {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}${p}`); if (r.ok) return await r.json(); } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome devtools endpoint never came up');
}
const page = (await devtools('/json/list')).find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 1; const pending = new Map();
const send = (m, p = {}) => new Promise((res, rej) => {
  const i = id++; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: m, params: p }));
});
let logs = []; let api = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); return; }
  const p = m.params;
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(p.type))
    logs.push(`${p.type}: ${String((p.args ?? []).map((a) => a.value ?? a.description).join(' ')).split('\n')[0].slice(0, 120)}`);
  if (m.method === 'Runtime.exceptionThrown')
    logs.push(`uncaught: ${String(p.exceptionDetails?.exception?.description).split('\n')[0].slice(0, 120)}`);
  if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(p.entry.level))
    logs.push(`${p.entry.level}: ${String(p.entry.text).slice(0, 120)}`);
  if (m.method === 'Network.responseReceived' && p.response.url.includes('/api/v1/'))
    api.push(`${p.response.status} ${p.response.url.replace(APP, '')}`);
};
await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable'); await send('Page.enable');

async function visit(path, wait = 3000) {
  logs = []; api = [];
  await send('Page.navigate', { url: APP + path });
  await sleep(wait);
  const r = await send('Runtime.evaluate', { expression: AUDIT, returnByValue: true });
  return { dom: JSON.parse(r.result.value), logs: [...logs], api: [...api] };
}

console.log(`\nNurseLingua UI verification\n  app: ${APP}\n  api: ${API}\n`);
await visit('/');
await send('Runtime.evaluate', {
  expression: `localStorage.setItem('nurselingua-auth', ${JSON.stringify(JSON.stringify({ token: TOKEN, email: EMAIL, name: 'UI Verify' }))});`,
});

let pass = 0, fail = 0;
for (const path of ROUTES) {
  const r = await visit(path);
  const d = r.dom;
  const reds = r.logs.filter((l) => l.startsWith('error') || l.startsWith('uncaught') || l.startsWith('log:error'));
  const bad = r.api.filter((a) => Number(a.split(' ')[0]) >= 400);
  const issues = [];
  if (d.emoji.length) issues.push(`emoji icons: ${d.emoji.join(' ')}`);
  if (d.emDash) issues.push(`em dashes: ${d.emDash}`);
  if (d.pills.length) issues.push(`pill buttons: ${d.pills.join(' | ')}`);
  if (d.purple.length) issues.push(`purple: ${d.purple.join(' | ')}`);
  if (reds.length) issues.push(`console: ${reds.slice(0, 2).join(' | ')}`);
  if (bad.length) issues.push(`http >= 400: ${bad.join(', ')}`);
  if (d.chars < 80) issues.push(`blank screen (${d.chars} chars)`);
  if (!d.skipLink) issues.push('no skip link');
  if (!d.mainId) issues.push('no #main landmark');
  issues.length ? fail++ : pass++;
  console.log(`${issues.length ? 'FAIL' : 'PASS'}  ${path}  chars=${d.chars} svg=${d.svgIcons} img=${d.imgTags}`);
  for (const i of issues) console.log(`        ${i}`);
}

const css = await (await fetch(`${APP}/src/styles.css`)).text();
const cssChecks = [
  ['prefers-reduced-motion', css.includes('prefers-reduced-motion')],
  ['safe-area insets', css.includes('env(safe-area-inset-bottom)')],
  ['skip-link rule', css.includes('.skip-link')],
];
console.log('\nCSS requirements');
for (const [name, ok] of cssChecks) { if (!ok) fail++; else pass++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); }

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
ws.close(); chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch { /* windows lock */ }
process.exit(fail ? 1 : 0);
