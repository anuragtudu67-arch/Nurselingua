# NurseLingua

A communication aid for routine nursing care. A nurse taps a reviewed phrase or types a
sentence, the patient hears it in their language, and both languages stay on screen for
every turn. A professional interpreter is one tap away for anything critical.

NurseLingua is **not** a medical device, a diagnosis tool, or an emergency service, and it
does not replace a qualified interpreter for consent, serious news, or end-of-life
conversations. The app says so on the landing page, in Settings, and before first use.

## Stack

| Piece | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite, hand-written CSS on design tokens, Tailwind available |
| API | Spring Boot 3.5 (Java 21), Spring Security, JPA, Flyway, MySQL |
| Auth | A dev shim accepts `Bearer dev.<email>` locally. Clerk RS256 verification exists in code but is **not yet tested** with a real token |
| Async speech | **Simulated.** Submit and poll in the backend; the STT/TTS pipeline completes on a timer, and no real audio is uploaded or transcribed |
| Media | Cloudflare R2 presign is implemented but **not yet tested**; with R2 off, uploads fall back to `inline/` references |
| Automation | n8n is wired but **not used**: `n8n/workflows/evaluation.json` is a legacy stub that does not match the callback contract, and no workflow is imported |

Data retention is **soft-delete only**. An hourly scheduled job sets `deleted = true` on
conversations past `expires_at`, and `DELETE /conversations/{id}` does the same; nothing ever
purges the rows, so soft-deleted conversations and their turns remain in the database.

## Layout

```
frontend/     React app (Vercel)
backend/      Spring Boot API (Render or Fly.io)
docs/API.md   the /api/v1 contract
n8n/          workflow definitions and their README
db/           database planning notes (Flyway owns the schema)
storage/      R2 planning notes
tools/        verification scripts
api-mock/     legacy demo API, see the warning below
```

**`api-mock/` implements a different product.** It serves a language-learning contract
(courses, lessons, vocabulary), not the NurseLingua one. Its `/api/health` answers, so the
frontend will switch to "live mode" and then fail on every real endpoint. Use
`npm run backend`, not `npm run dev:api`.

## Run it

```bash
npm run install:all
```

Zero infrastructure (no MySQL, no n8n, no R2) using the in-memory H2 profile:

```bash
.tools/apache-maven-3.9.9/bin/mvn -f backend/pom.xml spring-boot:run \
  -Dspring-boot.run.profiles=h2 -Dspring-boot.run.arguments=--server.port=8081
npm run dev:frontend          # terminal 2, http://localhost:5173
```

Ports: the Vite dev server proxies `/api` to `VITE_API_URL` or `http://localhost:8080` by
default, so pass the same port you started the API on:

```bash
VITE_API_URL=http://localhost:8081 npm run dev:frontend
```

With MySQL instead, copy `.env.example` to `.env`, run `npm run infra:up` for MySQL and n8n,
then `npm run backend`. Compose creates the database and user `nurselingua` to match the
backend defaults; only `MYSQL_PORT` / `SPRING_DATASOURCE_*` need changing for a remote database.

Any email signs you in locally (the dev shim issues the token). `NURSELINGUA_DEV_AUTH=false`
disables that shim and must be set on any deployed environment.

## Windows: native MySQL already on 3306

Many Windows machines already run a native `mysqld.exe` on 3306. Compose therefore publishes
MySQL on host port **3307** (`${MYSQL_PORT:-3307}`), and `application.yml` reads the same
`MYSQL_PORT` variable with the same 3307 default, so the two always agree and the native
server is never touched. No `SPRING_DATASOURCE_URL` override is needed.

```powershell
# 1. MySQL container on host port 3307 (change with $env:MYSQL_PORT before this line)
docker compose up -d mysql

# 2. backend on http://localhost:8080; Flyway applies V1..V7 on first run
cd backend
.\mvnw.cmd spring-boot:run

# 3. frontend in a second window. PowerShell needs $env:, not VAR=value
cd ..
$env:VITE_API_URL = "http://localhost:8080"
npm run dev:frontend
```

Confirm the container and the tables it holds:

```powershell
docker ps --filter name=ningua-mysql
docker exec -it ningua-mysql mysql -unurselingua -pchangeme --default-character-set=utf8mb4 `
  nurselingua -e "SHOW TABLES;"
```

Pass `--default-character-set=utf8mb4` on Windows: `mysql.exe` otherwise connects as latin1
and prints `aquí` as `aquÃ­`, even though the stored bytes are correct UTF-8. Start PowerShell
sessions for this project with `chcp 65001` if accented output still looks wrong.

If you move the container to another port, set `$env:MYSQL_PORT` before both `docker compose`
and the backend, or pass `SPRING_DATASOURCE_URL` explicitly to the backend.

## Demo walkthrough

1. **Landing** (`/`) states what the app does, with one dominant action.
2. **Sign up** with any email.
3. **Onboarding**: your language, the patient languages you meet, playback speed, retention.
4. **Home**: start a conversation, browse categories, reuse recent phrases.
5. **Phrasebook**: reviewed phrases per language with romanisation, favourites, search.
6. **Conversation**: tap a phrase, type, or record the patient. Every turn shows both
   languages, and a drawer keeps the phrasebook reachable.
7. **History**: usage analytics, replay, delete. Retention follows your Settings choice.
8. **Interpreter**: the fastest route to a human interpreter, reachable from every screen.

## Verify before deploying

```bash
npm run verify:ui     # routes, console, and the design constraints below
npm run verify:api    # health, auth modes, DTO shapes, error shapes, async flow, webhook, CORS
```

Both scripts exit non-zero on failure, so they can gate a deploy. `verify:api` expects the
API on `:8081` and `verify:ui` the app on `:5173`; override with `API_URL` and `APP_URL`.

## Design constraints

These are enforced by `npm run verify:ui`, not left to review:

* inline SVG icons only, never emoji or dingbat glyphs
* no em dashes in user-visible copy
* no pill-shaped buttons (fully rounded and wider than tall)
* no purple hues; the palette is clinical teal for the nurse and blue for the patient
* no photographic or generated imagery at all, so nothing can be mistaken for a real photo
* no invented metrics, reviews, or testimonials
* minimum 44px touch targets, visible focus rings, a skip link and a `main` landmark on
  every route, and `prefers-reduced-motion` support

## Documentation

* `docs/API.md`: the `/api/v1` contract
* `HANDOFF.md`: current state, open decisions, and the deployment checklist
* `INTELLIJ_DEMO.md`: running the demo from IntelliJ
