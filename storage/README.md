# Ningua Object Storage — Cloudflare R2

Bucket `ningua-media`: speech recordings, pronunciation files, media.
The browser **never holds permanent storage credentials** (spec §11.3) —
Spring mints short-lived SigV4 presigned PUT URLs (`R2Storage`, no AWS SDK).

## Flow

1. `POST /api/v1/uploads/presign` → `{ url, ref, expiresIn: 300, mode: "r2" }`
2. Browser `PUT`s the recording straight to R2 (UI handles progress/retry/discard)
3. `POST /api/v1/speech/submissions` with `{ exerciseId, storageRef }` → job id + `processing`
4. Evaluation completes → poll `/speech/{id}/status` (or n8n callback fills it)

## Configure

```env
R2_ENABLED=true
R2_ACCOUNT_ID=<cloudflare account id>          # <account>.r2.cloudflarestorage.com
R2_BUCKET=ningua-media
R2_ACCESS_KEY_ID=<R2 API token access key>
R2_SECRET_ACCESS_KEY=<R2 API token secret>
R2_PUBLIC_BASE_URL=https://media.ningua.com    # optional, for serving audio
```

Create the token in Cloudflare → R2 → **Manage API tokens** (Object Read & Write
scoped to `ningua-media`).

With `R2_ENABLED=false` (default), presign returns `mode: "inline"` and a
demo reference — the full loop still works locally with zero cloud setup.

## Bucket CORS (production)

Allow the frontend origin to `PUT` recordings:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://ningua.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 300
  }
]
```
