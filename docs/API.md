# NurseLingua API — `/api/v1`

All endpoints return JSON. Errors use one calm shape:

```json
{ "error": "human-readable message", "status": 404 }
```

Auth: `Authorization: Bearer <Clerk session token>` — identity is derived from
the verified token `sub`; the client never sends a trusted user id.
Dev mode (`NURSELINGUA_DEV_AUTH=true`): `Authorization: Bearer dev.<email>`.

Public (no auth): `/api/health`, `/actuator/health`, `/api/v1/languages`,
`/api/v1/categories`, `/api/v1/phrases*` (auth only enriches favorites).
`POST /api/v1/webhooks/n8n` is authenticated by the `X-N8N-Secret` shared
secret, not by Clerk.

## Catalog

| Method | Path | Notes |
|---|---|---|
| GET | `/languages` | code, name, nativeName, ttsLocale (`es-MX`, `hi-IN`…), sttSupported, script, hasRomanization, uiLocaleSupport, rtl |
| GET | `/categories` | the 5 phrasebook categories in order |
| GET | `/phrases?category=pain&lang=es` | phrases + patient-language translation (romanization included for non-Latin scripts) + favorite flag |
| GET | `/phrases?q=headache&lang=es` | search by base text |
| GET | `/phrases/{id}?lang=hi` | single phrase; `cardType: "PAIN_SCALE"` for the 0–10 card |

## User, onboarding, settings

| Method | Path | Notes |
|---|---|---|
| GET | `/users/me` | `{ userId, email, name, settings, onboardingComplete }` |
| POST | `/onboarding` | `{ nurseLanguage, patientLanguages[], speechRate: "slow"\|"normal", retention: "24h"\|"7days"\|"off" }` |
| PUT | `/settings` | same fields, all optional |

## Conversations

| Method | Path | Notes |
|---|---|---|
| POST | `/conversations` | `{ patientLanguage, nurseLanguage?, title? }` → conversation (expiry set from retention) |
| GET | `/conversations` | history (soft-deleted excluded) |
| GET | `/conversations/{id}` | conversation + turns in order |
| DELETE | `/conversations/{id}` | manual delete |
| POST | `/conversations/{id}/turns` | see below |

**Turn request** — exactly one of `text` / `phraseId` / `workflowId`:

```json
{ "speaker": "NURSE", "phraseId": "ph-pain-01" }
{ "speaker": "NURSE", "text": "Where is your pain?" }
{ "speaker": "PATIENT", "text": "मुझे कल से सिर दर्द है", "sttConfidence": 0.92 }
```

Nurse turns translate nurse→patient language; patient turns patient→nurse.
Every turn stores source + target (+ romanization) so **both languages are
always visible**. A fuzzy library hit stores `libraryPhraseId` and the reviewed
translation; otherwise MT is used (`matchedLibrary` reflects this on
`/translations`; on turns it shows as `libraryPhraseId: null`).

## One-shot translation

```
POST /translations { "text": "Take one tablet after meals.", "from": "en", "to": "hi" }
→ { "text": "खाने के बाद एक गोली लें।", "romanization": "Khaane ke baad ek goli len.",
    "matchedLibrary": true, "professionallyReviewed": true, "phraseId": "ph-med-01", ... }
```

## Async speech (submit → poll; the frontend never touches vendors)

| Method | Path | Notes |
|---|---|---|
| POST | `/uploads/presign` | `{ extension }` → `{ url, ref, expiresIn, mode: "r2"\|"inline" }` |
| POST | `/speech/submissions` | `{ storageRef, languageHint }` → 202 `{ id, status }` |
| GET | `/speech/{id}/status` | `{ status: processing\|completed\|failed, result: { transcript, confidence } }` |
| POST | `/tts` | `{ text, language, rate: "slow"\|"normal" }` → 202 `{ id, status }` |
| GET | `/tts/{id}/status` | `{ status, result: { audioRef, ttsLocale, rate } }` |

## Favorites & recents

| Method | Path | Notes |
|---|---|---|
| GET | `/favorites` | starred phrases (per patient language) |
| POST | `/favorites` | `{ phraseId, languageCode }` |
| DELETE | `/favorites/{phraseId}/{languageCode}` | unstar |
| GET | `/recents` | last-used phrases, newest first |

## Usage (analytics backbone)

| Method | Path | Notes |
|---|---|---|
| GET | `/usage` | sessions, turns, language pairs, top phrases, STT/MT/TTS `{ total, failures, failureRate, avgLatencyMs }` |
| POST | `/usage/events` | `{ eventType, languagePair?, phraseId?, outcome?, latencyMs?, detail? }` → 202 |

## Webhook

```
POST /api/v1/webhooks/n8n
Header: X-N8N-Secret: <N8N_WEBHOOK_SECRET>
Body: { "jobId", "status": "completed"|"failed", "result": {...}, "error"? }
```

Missing/invalid secret → 403. Unknown `jobId` is ignored silently (idempotent).
