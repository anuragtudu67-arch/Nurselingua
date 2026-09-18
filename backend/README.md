# NurseLingua Backend — Spring Boot API

The communication assistance API for nurses: phrasebook, two-sided conversation
with library-first translation, async STT/TTS workflows, history with retention,
and usage analytics.

```
backend/
├── pom.xml
└── src/
    ├── main/
    │   ├── java/com/nurselingua/
    │   │   ├── NurseLinguaApplication.java
    │   │   ├── config/       # SecurityConfig, NurseLinguaProperties
    │   │   ├── security/     # NurseLinguaJwtFilter, NurseLinguaJwtVerifier, SecurityUserService, AppUser
    │   │   ├── controller/   # Catalog, User, Conversation, Media, Health, GlobalExceptionHandler
    │   │   ├── service/      # Language, Phrase, Translation (library-first), Conversation,
    │   │   │                 # Favorite (+recents), Usage, User (+settings)
    │   │   ├── repository/   # Spring Data JPA repositories
    │   │   ├── entity/       # JPA entities (Flyway owns the schema)
    │   │   ├── dto/          # Contract DTOs (docs/API.md)
    │   │   └── integration/  # N8nClient, R2Storage (SigV4 presign), WorkflowOrchestrator, UserResolver
    │   └── resources/
    │       ├── application.yml          # MySQL default + `h2` zero-infra profile
    │       └── db/migration/            # V1 schema · V2 langs/categories · V3 phrases · V4–V7 translations
    └── test/java/com/nurselingua/       # Full nurse-journey integration test + retention job test
```

## Run

**Zero-infra dev (H2 in-memory, no MySQL/n8n/R2 needed):**

```bash
../.tools/apache-maven-3.9.9/bin/mvn spring-boot:run -Dspring-boot.run.profiles=h2
```

**Full stack (MySQL + n8n via docker compose):**

```bash
docker compose up -d          # from repo root
../.tools/apache-maven-3.9.9/bin/mvn spring-boot:run
```

Flyway migrates and seeds on boot: 12 tables, 13 languages (en + 12 patient
languages), 5 categories, 72 phrases, 576 professionally reviewed translations
(es, hi, bn, fr, ar, zh, ta, ur) with romanization for every non-Latin script.

Health: `GET http://localhost:8080/api/health`.

## Tests

```bash
../.tools/apache-maven-3.9.9/bin/mvn test     # boots H2 profile automatically
```

`NurseJourneyIntegrationTest` covers the full nurse journey for **both**
English→Spanish and English→Hindi sessions: onboarding → phrasebook lookup →
nurse turn via library phrase → patient turn via async STT workflow → TTS audio
reference → history → favorites → usage. It asserts the **reviewed translation is
preferred over MT**, **romanization is present for Devanagari**, and
`RetentionJobTest` asserts **retention expiry** soft-deletes only expired
conversations.

## Auth

* **Dev/demo mode** (`NURSELINGUA_DEV_AUTH=true`, default): `Authorization: Bearer dev.<email>`
  provisions and identifies the local user — no Clerk keys needed.
* **Production**: set `CLERK_JWT_ISSUER` (JWKS) or `CLERK_JWT_PUBLIC_KEY`, set
  `NURSELINGUA_DEV_AUTH=false`. Session JWTs (RS256) are verified; identity is
  derived from the token `sub` — the client never sends a trusted user id.

## Async speech workflows (STT / TTS)

`N8N_ENABLED=true` → `N8nClient` fires the n8n webhook; results return via the
shared-secret callback `POST /api/v1/webhooks/n8n` (`X-N8N-Secret` header,
401/403 on mismatch).
`N8N_ENABLED=false` → an internal simulated pipeline completes STT jobs after
~2.5s and TTS jobs after ~1.5s so the full loop works locally without n8n.
The frontend only ever polls `/speech/{id}/status` and `/tts/{id}/status`.

## Object storage

`R2_ENABLED=true` → `POST /api/v1/uploads/presign` returns a 5-minute SigV4
presigned PUT for `nurselingua-media`; the browser uploads directly and submits
the returned ref. `R2_ENABLED=false` → demo mode: `ref` is an inline reference
(no credentials anywhere near the browser).

## Safety scope

A communication aid for **routine interactions** — not a medical device, not a
diagnosis tool. There are **no diagnosis, treatment, or clinical-decision
fields** anywhere in the schema. MT fallback is a visible fallback, never a
silent replacement for the reviewed library.
