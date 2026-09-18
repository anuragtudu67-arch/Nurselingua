# Ningua Automation — n8n

Internal workflows. **Only Spring Boot calls n8n** (webhook with a shared
secret); the frontend never does (spec §11.4). n8n calls back into Spring at
`/api/v1/webhooks/n8n` with the `X-N8N-Secret` header.

## Workflow

`workflows/evaluation.json` — speaking/writing evaluation:

```
Webhook  POST /webhook/ningua-evaluate   { jobId, kind, storageRef, targetText, prompt }
  → Code node: build feedback (local AI/STT stub — swap real providers here)
  → HTTP Request: POST http://host.docker.internal:8080/api/v1/webhooks/n8n
                  header X-N8N-Secret: <shared secret>
                  body { jobId, status, transcript, feedback }
```

## Run locally

```bash
docker compose up -d n8n        # from repo root
```

1. Open http://localhost:5678 (first visit creates the owner account).
2. **Workflows → Import from file** → `n8n/workflows/evaluation.json`.
3. Activate the workflow. The webhook path is `ningua-evaluate`.
4. Set `N8N_ENABLED=true` and `N8N_WEBHOOK_URL=http://localhost:5678/webhook/ningua-evaluate`
   for the backend; keep `N8N_WEBHOOK_SECRET` identical in both places.

With `N8N_ENABLED=false` (default), the backend's simulated pipeline completes
jobs after ~6s — same contract, no n8n needed.
