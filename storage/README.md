# NurseLingua Object Storage — Cloudflare R2

Bucket `nurselingua-media`: speech recordings and cached TTS output. The browser
**never holds permanent storage credentials** — Spring mints short-lived SigV4
presigned PUT URLs (`integration/R2Storage.java`, hand-rolled, no AWS SDK).

## Flow

1. `POST /api/v1/uploads/presign` with `{ extension }` →
   `{ url, ref, expiresIn: 300, mode: "r2" }`
2. The browser `PUT`s the recording straight to R2 (the UI handles progress, retry,
   discard)
3. `POST /api/v1/speech/submissions` with `{ storageRef, languageHint }` →
   `202 { id, status: "processing" }`
4. Poll `/api/v1/speech/{id}/status`; n8n fills the result via the callback webhook

## Configure

```env
R2_ENABLED=true
R2_ACCOUNT_ID=<cloudflare account id>          # <account>.r2.cloudflarestorage.com
R2_BUCKET=nurselingua-media
R2_ACCESS_KEY_ID=<R2 API token access key>
R2_SECRET_ACCESS_KEY=<R2 API token secret>
R2_PUBLIC_BASE_URL=https://media.nurselingua.health   # optional, for serving audio
```

Create the token in Cloudflare → R2 → **Manage API tokens** (Object Read & Write
scoped to `nurselingua-media`).

With `R2_ENABLED=false` (the default), presign returns `mode: "inline"` and a demo
reference — the full loop still works locally with zero cloud setup.

## Bucket CORS (production)

Allow the frontend origin to `PUT` recordings:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://<your-domain>"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 300
  }
]
```
