# NurseLingua Automation — n8n

Internal workflows for async speech. **Only Spring Boot calls n8n** (webhook with a
shared secret); the frontend never does. n8n calls back into Spring at
`POST /api/v1/webhooks/n8n` with the `X-N8N-Secret` header.

## Contract

Spring fires a single webhook (`N8N_WEBHOOK_URL`) for both job kinds, with a body like:

```json
{ "jobId": "stt_…", "kind": "stt", "storageRef": "r2://nurselingua-media/…",
  "languageHint": "es", "ttsLocale": "es-MX", "callbackUrl": "/api/v1/webhooks/n8n" }
```

For TTS the body carries `{ jobId, kind: "tts", text, ttsLocale, rate }` instead.

The workflow runs the real STT/TTS vendors on the server side, then calls back:

```
POST /api/v1/webhooks/n8n
Header: X-N8N-Secret: <N8N_WEBHOOK_SECRET>
Body:   { "jobId": "stt_…", "status": "completed",
          "result": { "transcript": "…", "confidence": 0.92 }, "error": null }
```

Missing/invalid secret → `403`. Unknown `jobId` is ignored silently (idempotent). The
`result` object must be the vendor payload for the job kind:
`{ transcript, confidence }` for STT, `{ audioRef, ttsLocale, rate }` for TTS.

## Run locally

```bash
docker compose up -d n8n        # from repo root
```

1. Open http://localhost:5678 (first visit creates the owner account).
2. Import your workflow (**Workflows → Import from file**).
3. Activate it, then set for the backend:
   `N8N_ENABLED=true` and `N8N_WEBHOOK_URL=http://localhost:5678/webhook/<your-path>`;
   keep `N8N_WEBHOOK_SECRET` identical on both sides.

With `N8N_ENABLED=false` (the default), the backend's simulated pipeline completes
STT jobs after ~2.5s and TTS jobs after ~1.5s — same contract, no n8n needed.

> The bundled `workflows/evaluation.json` is a **legacy stub** from the earlier
> product: it expects a `kind: "speaking"` evaluation body and posts
> `{ jobId, status, transcript, feedback }` without a `result` wrapper, so it sets the
> job status but not its result payload. Replace it with an STT/TTS workflow that
> follows the contract above.
