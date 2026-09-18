#!/usr/bin/env node
// NurseLingua API verification.
//
// Checks the Spring API against the contract the frontend actually depends on:
// health, auth modes, DTO shapes per endpoint, clean 400s (never 500s), the 202
// submit-and-poll speech flow, the n8n webhook secret, CORS, and the golden path
// from onboarding through to history.
//
// Usage (with the API running, e.g. the h2 profile on :8081):
//   npm run verify:api
//   API_URL=http://localhost:8080 WEBHOOK_SECRET=... node tools/verify-api.mjs
//
// Exits 1 when a check fails, so it can gate a deploy. The three WARN checks are
// open decisions or documented demo behaviour, not failures.
const API = process.env.API_URL ?? 'http://localhost:8081';
const V1 = `${API}/api/v1`;
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:5173';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? 'change-me-long-random';
const EMAIL = process.env.VERIFY_EMAIL ?? 'api.verify@example.com';
const TOKEN = `dev.${encodeURIComponent(EMAIL)}`;

let pass = 0, fail = 0, warn = 0;
const failures = [];
function check(name, ok, evidence) {
  if (ok) { pass++; console.log(`PASS  ${name}${evidence ? `\n        ${evidence}` : ''}`); return; }
  fail++; failures.push(name);
  console.log(`FAIL  ${name}${evidence ? `\n        ${evidence}` : ''}`);
}
function note(name, evidence) { warn++; console.log(`WARN  ${name}${evidence ? `\n        ${evidence}` : ''}`); }

async function call(method, path, { body, token, headers, raw } = {}) {
  const res = await fetch(`${V1}${path}`, {
    method,
    headers: {
      ...(body !== undefined && !raw ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  return { status: res.status, json, text, headers: res.headers };
}

// Key sets from frontend/src/api/client.ts, which is what the UI consumes.
const EXPECT = {
  Language: ['code', 'name', 'nativeName', 'ttsLocale', 'sttSupported', 'script', 'hasRomanization', 'uiLocaleSupport', 'rtl'],
  Category: ['slug', 'name', 'description', 'position'],
  PhraseTranslation: ['languageCode', 'text', 'romanization', 'audioRef', 'professionallyReviewed'],
  Phrase: ['id', 'categorySlug', 'baseText', 'isQuestion', 'cardType', 'tags', 'priority', 'translations', 'favorite'],
  Settings: ['nurseLanguage', 'patientLanguages', 'speechRate', 'retention'],
  UsersMe: ['userId', 'email', 'name', 'settings', 'onboardingComplete'],
  Conversation: ['id', 'nurseLanguage', 'patientLanguage', 'title', 'startedAt', 'lastActivityAt', 'expiresAt', 'turnCount'],
  Turn: ['id', 'speaker', 'sourceText', 'sourceLang', 'targetText', 'targetLang', 'targetRomanization', 'libraryPhraseId', 'sttConfidence', 'audioRef', 'status', 'createdAt'],
  Translation: ['sourceText', 'sourceLang', 'text', 'targetLang', 'romanization', 'matchedLibrary', 'phraseId', 'professionallyReviewed'],
  Presign: ['url', 'ref', 'expiresIn', 'mode'],
  WorkflowSubmission: ['id', 'status'],
  WorkflowStatus: ['id', 'kind', 'status', 'result', 'error'],
  Favorite: ['phraseId', 'languageCode', 'createdAt'],
  Recent: ['phraseId', 'languageCode', 'usedAt'],
};
const OPTIONAL_IN_TS = ['romanization', 'audioRef', 'targetRomanization', 'libraryPhraseId', 'sttConfidence'];

function shape(label, name, obj) {
  const expected = EXPECT[name];
  const actual = Object.keys(obj ?? {});
  const missing = expected.filter((k) => !actual.includes(k));
  const extra = actual.filter((k) => !expected.includes(k) && !OPTIONAL_IN_TS.includes(k));
  check(`${label} matches ${name}`, missing.length === 0 && extra.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : extra.length ? `unexpected: ${extra.join(', ')}` : `${actual.length} keys`);
}

console.log(`\nNurseLingua API verification\n  api: ${API}\n`);

// ---------- health and auth ----------
{
  const r = await fetch(`${API}/api/health`);
  check('GET /api/health returns 200', r.status === 200, `${r.status} ${(await r.text()).slice(0, 60)}`);

  const noToken = await call('GET', '/users/me');
  check('no token is rejected with 401', noToken.status === 401, `${noToken.status}`);

  const badToken = await call('GET', '/users/me', { token: 'garbage.token.value' });
  check('invalid token is rejected with 401 or 403', [401, 403].includes(badToken.status), `${badToken.status}`);

  const badDev = await call('GET', '/users/me', { token: 'dev.not-an-email' });
  check('malformed dev token is rejected', badDev.status === 401, `${badDev.status}`);

  const ok = await call('GET', '/users/me', { token: TOKEN });
  check('valid token returns 200', ok.status === 200, `${ok.status}`);
  shape('GET /users/me', 'UsersMe', ok.json);
  shape('GET /users/me .settings', 'Settings', ok.json?.settings);
}

// ---------- catalog ----------
let phrases = [];
{
  const langs = await call('GET', '/languages');
  check('GET /languages (public) returns 200', langs.status === 200, `${langs.status}, ${langs.json?.length ?? '?'} rows`);
  shape('GET /languages[0]', 'Language', langs.json?.[0]);

  const cats = await call('GET', '/categories');
  check('GET /categories (public) returns 200', cats.status === 200, `${cats.status}, ${cats.json?.length ?? '?'} rows`);
  shape('GET /categories[0]', 'Category', cats.json?.[0]);

  const authed = await call('GET', '/phrases?lang=es', { token: TOKEN });
  check('GET /phrases returns 200', authed.status === 200, `${authed.status}, ${authed.json?.length ?? '?'} rows`);
  shape('GET /phrases[0]', 'Phrase', authed.json?.[0]);
  shape('GET /phrases[0].translations[0]', 'PhraseTranslation', authed.json?.[0]?.translations?.[0]);
  phrases = Array.isArray(authed.json) ? authed.json : [];

  const anonymous = await call('GET', '/phrases?lang=es');
  if (anonymous.status !== 200) {
    note('GET /phrases without a token is not public', `docs/API.md lists /phrases* as public, the API answers ${anonymous.status}. Open decision: permit it in SecurityConfig or correct the docs.`);
  } else {
    check('GET /phrases is public as documented', true, `${anonymous.status}`);
  }

  const single = await call('GET', `/phrases/${phrases[0]?.id}?lang=hi`, { token: TOKEN });
  check('GET /phrases/{id} with a non-Latin language returns romanisation',
    single.status === 200 && !!single.json?.translations?.[0]?.romanization,
    `${single.status} romanization=${JSON.stringify(single.json?.translations?.[0]?.romanization)}`);
}

// ---------- error shapes: 400 for bad input, never 500 ----------
{
  const t = await call('POST', '/translations', { body: {}, token: TOKEN });
  check('POST /translations with {} returns a clean 400', t.status === 400 && t.json?.status === 400 && !!t.json?.error, `${t.status} ${JSON.stringify(t.json)}`);

  const stt = await call('POST', '/speech/submissions', { body: {}, token: TOKEN });
  check('POST /speech/submissions with {} returns a clean 400', stt.status === 400 && !!stt.json?.error, `${stt.status} ${JSON.stringify(stt.json)}`);

  const tts = await call('POST', '/tts', { body: {}, token: TOKEN });
  check('POST /tts with {} returns a clean 400', tts.status === 400 && !!tts.json?.error, `${tts.status} ${JSON.stringify(tts.json)}`);

  // Malformed body but a correct Content-Type: the case that used to be a 500.
  const malformed = await call('POST', '/translations', {
    body: '{not json', token: TOKEN, raw: true, headers: { 'Content-Type': 'application/json' },
  });
  check('malformed JSON returns 400, not 500', malformed.status === 400, `${malformed.status} ${malformed.text.slice(0, 80)}`);

  const missing = await call('GET', '/conversations/does-not-exist', { token: TOKEN });
  check('unknown conversation returns a clean 404', missing.status === 404 && !!missing.json?.error, `${missing.status} ${JSON.stringify(missing.json)}`);

  const noEndpoint = await call('GET', '/no-such-endpoint', { token: TOKEN });
  check('unmapped endpoint returns 404, not 500', noEndpoint.status === 404, `${noEndpoint.status} ${noEndpoint.text.slice(0, 70)}`);

  const wrongMethod = await call('DELETE', '/languages', { token: TOKEN });
  check('disallowed method returns 405, not 500', wrongMethod.status === 405, `${wrongMethod.status} ${wrongMethod.text.slice(0, 70)}`);

  const wrongType = await call('POST', '/translations', { body: '{}', token: TOKEN, headers: { 'Content-Type': 'text/plain' } });
  check('unsupported content type returns 415, not 500', wrongType.status === 415, `${wrongType.status} ${wrongType.text.slice(0, 70)}`);
}

// ---------- CORS ----------
{
  const pre = await fetch(`${V1}/languages`, { method: 'OPTIONS', headers: { Origin: APP_ORIGIN, 'Access-Control-Request-Method': 'GET' } });
  check(`CORS preflight from ${APP_ORIGIN} is allowed`, pre.headers.get('access-control-allow-origin') === APP_ORIGIN,
    `allow-origin: ${pre.headers.get('access-control-allow-origin')}`);

  const stranger = await fetch(`${V1}/languages`, { method: 'OPTIONS', headers: { Origin: 'http://not-your-app.example' } });
  check('CORS preflight from an unknown origin is refused', !stranger.headers.get('access-control-allow-origin'),
    `allow-origin: ${stranger.headers.get('access-control-allow-origin')}`);
}

// ---------- async speech: submit then poll ----------
{
  const sub = await call('POST', '/speech/submissions', { body: { storageRef: 'inline/verify-1', languageHint: 'es' }, token: TOKEN });
  check('POST /speech/submissions returns 202 with a job id', sub.status === 202 && !!sub.json?.id, `${sub.status} ${JSON.stringify(sub.json)}`);
  shape('  submission', 'WorkflowSubmission', sub.json);

  let status = null;
  for (let i = 0; i < 15; i++) {
    const st = await call('GET', `/speech/${sub.json.id}/status`, { token: TOKEN });
    status = st.json;
    if (status?.status === 'completed' || status?.status === 'failed') break;
    await new Promise((r) => setTimeout(r, 600));
  }
  check('polling /speech/{id}/status completes with a transcript',
    status?.status === 'completed' && !!status?.result?.transcript,
    `${status?.status} transcript=${JSON.stringify(status?.result?.transcript)} confidence=${status?.result?.confidence}`);
  shape('  status', 'WorkflowStatus', status);

  const tts = await call('POST', '/tts', { body: { text: 'Where is your pain?', language: 'es', rate: 'slow' }, token: TOKEN });
  check('POST /tts returns 202 with a job id', tts.status === 202 && !!tts.json?.id, `${tts.status} ${JSON.stringify(tts.json)}`);
  let ttsStatus = null;
  for (let i = 0; i < 15; i++) {
    const st = await call('GET', `/tts/${tts.json.id}/status`, { token: TOKEN });
    ttsStatus = st.json;
    if (ttsStatus?.status === 'completed' || ttsStatus?.status === 'failed') break;
    await new Promise((r) => setTimeout(r, 500));
  }
  check('polling /tts/{id}/status completes with an audio ref',
    ttsStatus?.status === 'completed' && !!ttsStatus?.result?.audioRef,
    `${ttsStatus?.status} ${JSON.stringify(ttsStatus?.result)}`);
}

// ---------- n8n webhook ----------
{
  const wrong = await call('POST', '/webhooks/n8n', { body: { jobId: 'x', status: 'completed' }, headers: { 'X-N8N-Secret': 'definitely-wrong' } });
  check('webhook with a wrong secret returns 403', wrong.status === 403, `${wrong.status} ${JSON.stringify(wrong.json)}`);

  const job = await call('POST', '/speech/submissions', { body: { storageRef: 'inline/verify-2', languageHint: 'es' }, token: TOKEN });
  const sent = await call('POST', '/webhooks/n8n', {
    body: { jobId: job.json.id, status: 'completed', result: { transcript: 'WEBHOOK-PROOF', confidence: 0.99 } },
    headers: { 'X-N8N-Secret': WEBHOOK_SECRET },
  });
  check('webhook with the correct secret returns 200', sent.status === 200, `${sent.status} ${JSON.stringify(sent.json)}`);

  const st = await call('GET', `/speech/${job.json.id}/status`, { token: TOKEN });
  if (st.json?.result?.transcript === 'WEBHOOK-PROOF') {
    check('webhook result is applied to the job', true, `transcript=${JSON.stringify(st.json.result.transcript)}`);
  } else {
    note('webhook result was not applied to this job',
      `status=${st.json?.status} transcript=${JSON.stringify(st.json?.result?.transcript)}. The simulated pipeline (N8N_ENABLED=false) settles jobs after 2.5s and wins any race.`);
  }
}

// ---------- golden path ----------
{
  const on = await call('POST', '/onboarding', {
    body: { nurseLanguage: 'en', patientLanguages: ['es', 'hi'], speechRate: 'slow', retention: '7days' }, token: TOKEN,
  });
  check('POST /onboarding completes onboarding', on.status === 200 && on.json?.onboardingComplete === true, `${on.status} onboardingComplete=${on.json?.onboardingComplete}`);

  const conv = await call('POST', '/conversations', { body: { patientLanguage: 'es' }, token: TOKEN });
  check('POST /conversations creates a conversation', [200, 201].includes(conv.status) && !!conv.json?.id, `${conv.status}`);
  shape('  conversation', 'Conversation', conv.json);

  const seed = phrases.find((p) => p.translations?.length);
  const nurse = await call('POST', `/conversations/${conv.json.id}/turns`, { body: { speaker: 'NURSE', phraseId: seed?.id }, token: TOKEN });
  check('a nurse turn stores both languages', [200, 201].includes(nurse.status) && !!nurse.json?.sourceText && !!nurse.json?.targetText,
    `${nurse.status} "${nurse.json?.sourceText}" -> "${nurse.json?.targetText}"`);
  shape('  turn', 'Turn', nurse.json);

  const patient = await call('POST', `/conversations/${conv.json.id}/turns`, {
    body: { speaker: 'PATIENT', text: 'Me duele aquí desde esta mañana.', sttConfidence: 0.92 }, token: TOKEN,
  });
  check('a patient turn translates into the nurse language', [200, 201].includes(patient.status) && !!patient.json?.targetText,
    `${patient.status} "${patient.json?.sourceText}" -> "${patient.json?.targetText}"`);

  const detail = await call('GET', `/conversations/${conv.json.id}`, { token: TOKEN });
  check('GET /conversations/{id} returns the turns in order', detail.status === 200 && detail.json?.turns?.length === 2,
    `${detail.status} turns=${detail.json?.turns?.length}`);

  const history = await call('GET', '/conversations', { token: TOKEN });
  check('GET /conversations includes the new record', history.status === 200 && history.json?.some?.((c) => c.id === conv.json.id),
    `${history.status} ${history.json?.length} conversations`);

  const tr = await call('POST', '/translations', { body: { text: 'Take one tablet after meals.', to: 'hi' }, token: TOKEN });
  check('POST /translations returns translated text', tr.status === 200 && !!tr.json?.text, `${tr.status} "${tr.json?.text}"`);
  shape('  translation', 'Translation', tr.json);

  const freeText = await call('POST', '/translations', { body: { text: 'A sentence no glossary knows about.', to: 'es' }, token: TOKEN });
  if (freeText.status === 503) {
    note('free text outside the offline glossary returns 503',
      `${JSON.stringify(freeText.json?.error)}. Expected with N8N_ENABLED=false and no vendor keys; a clean shape, not a crash.`);
  } else {
    check('free text outside the glossary still translates', freeText.status === 200, `${freeText.status}`);
  }

  const presign = await call('POST', '/uploads/presign', { body: { extension: 'webm' }, token: TOKEN });
  check('POST /uploads/presign falls back to inline mode without R2', [200, 201].includes(presign.status) && presign.json?.mode === 'inline',
    `${presign.status} ${JSON.stringify(presign.json)}`);
  shape('  presign', 'Presign', presign.json);

  const fav = await call('POST', '/favorites', { body: { phraseId: seed?.id, languageCode: 'es' }, token: TOKEN });
  check('POST /favorites records a favourite', [200, 201].includes(fav.status), `${fav.status}`);
  shape('  favourite', 'Favorite', fav.json);

  const favs = await call('GET', '/favorites', { token: TOKEN });
  check('GET /favorites returns an array', favs.status === 200 && Array.isArray(favs.json), `${favs.status} ${favs.json?.length} items`);

  const recents = await call('GET', '/recents', { token: TOKEN });
  check('GET /recents returns an array', recents.status === 200 && Array.isArray(recents.json), `${recents.status} ${recents.json?.length} items`);
  if (recents.json?.[0]) shape('  recent', 'Recent', recents.json[0]);
}

console.log(`\n==== ${pass} passed, ${fail} failed, ${warn} warnings ====`);
if (failures.length) console.log(`failed: ${failures.join(' | ')}`);
console.log('');
process.exit(fail ? 1 : 0);
