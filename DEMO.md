# Ningua demo guide

Ningua is a nurse-to-patient communication aid for routine care. You speak or tap a reviewed
nursing phrase and it appears in the patient's language on screen and read aloud in a native
voice. You can also type or record the patient; the app shows both languages side by side.

The backend is frozen and verified; this guide is for a local supervisor demo only.

## Prerequisites and versions (verified on this machine)

- Docker Desktop 29.3.1 (running)
- Node.js **v24.19.0** (frontend only)
- JDK **25.0.1 (2025-10-21 LTS)** for the Java backend
- npm (bundled with the Node above)
- Maven: the blessed path on this machine is the bundled copy at `.tools/apache-maven-3.9.9/bin/mvn.cmd`. It exists and runs from a cold start. The repo also has a Maven wrapper at `backend/mvnw`; either works, but the `.tools` copy is the one I tested from CMD and PowerShell and is the one in the run steps below.
- No Python required for the demo.

Naming note: the service, database, tables, and code still say `nurselingua`; the UI brand is
Ningua. A rename is scheduled, so do not be surprised by the mixed names in configs and logs.

## Run steps

1. **Start Docker Desktop** from the Start menu. Wait until the whale icon in the system tray
   shows "Running".

2. **Start the containers** from the repo root. Port 3306 is already used by the machine's own
   MySQL80 service, so use host port 3307 for the demo database. Run these as two separate lines,
   not one chained command:
   ```
   set MYSQL_PORT=3307
   npm run infra:up
   ```
   This starts `ningua-mysql` (MySQL 8.4 on host port 3307) and the local n8n container on :5678.
   After it starts, confirm the database is ready with:
   ```
   docker inspect -f "{{.State.Health.Status}}" ningua-mysql
   ```
   Expect `healthy`.

3. **Start the backend** on port :8080. The repo's IntelliJ config named **"1 - Demo API (:8080)"**
   is an npm config that launches `api-mock/package.json` → `npm run start` → `node server.js` on
   port 8080. That is the Node.js mock, not the real Java backend. For the frozen, verified backend
   use Maven.

   The backend's built-in datasource default points at port **3306**, but this machine's native
   MySQL80 owns 3306, so the demo MySQL container is on **3307**. Point the backend at 3307 with
   `SPRING_DATASOURCE_URL`, then start it. These are the exact lines to paste in CMD (run each on
   its own line, no backslash continuations):
   ```
   set "SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3307/nurselingua?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
   .tools\apache-maven-3.9.9\bin\mvn.cmd -f backend/pom.xml spring-boot:run -Dspring-boot.run.arguments=--server.port=8080
   ```
   In PowerShell the first line is instead: `$env:SPRING_DATASOURCE_URL="jdbc:mysql://localhost:3307/nurselingua?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"`.
   Username and password already match the container defaults (`nurselingua` / `changeme`).
   Or with the repo's Maven wrapper (same env var applies):
   ```
   backend\mvnw.cmd -f backend/pom.xml spring-boot:run -Dspring-boot.run.arguments=--server.port=8080
   ```
   Boot proof to expect in the log: `No active profile set` (default profile, NOT h2),
   `Database: jdbc:mysql://localhost:3307/nurselingua... (MySQL 8.4)`,
   "Schema nurselingua is up to date" (Flyway v7), `Database version: 8.4.11`,
   `Tomcat started on port 8080`. Zero-infra H2 mode exists
   (`-Dspring-boot.run.profiles=h2`) but is not the demo path.

   Health: `curl http://localhost:8080/api/health` should return
   `{"ok":true,"service":"nurselingua-api"}`.

   How to tell the mock from the real backend on `/api/health`:
   - Mock returns `{"ok":true,"service":"ningua-api-mock"}` with an `X-Powered-By: Express` header.
   - Real Java backend returns `{"ok":true,"service":"nurselingua-api"}` without `X-Powered-By: Express`.
   - Mock `/api/v1/languages` rows look like `{"code":"en","name":"English","native":"English"}`.
   - Real backend `/api/v1/languages` rows look like
     `{"code":"en","name":"English","nativeName":"English","ttsLocale":"en-US","sttSupported":true,"script":"Latin","hasRomanization":false,"uiLocaleSupport":true,"rtl":false}`.

4. **Install and run the frontend**. Run these as separate lines:
   ```
   cd frontend
   npm install
   npm run dev
   ```
   The Vite dev server opens on **http://localhost:5173** and proxies `/api` straight to the
   backend on :8080, so the browser only ever uses relative URLs.

   If port 5173 is busy, Vite prints the port it fell back to — use that URL instead. If an old
   stale Vite server is sitting on 5173 with the wrong proxy, kill it first. On Windows, find the
   process with:
   ```
   netstat -ano | findstr ":5173"
   ```
   Then stop it with `taskkill //F //PID <pid>` (use the PID from the netstat output), then restart
   with `cd frontend && npm run dev`.

   If port 8080 is busy, the real backend only listens on :8080 in this demo. Stop whatever holds
   it, or pick a free port and set `--server.port=<free>` in the Maven command above.

## Demo click path (5–8 minutes)

Show each stop once; say one line per stop.

1. **Landing** — http://localhost:5173  \
   Header: Ningua mark, "How it works" / "Languages" / "Sign in". One primary CTA "Create an
   account", one quieter "See how it works". Show the four-stage support choice in the "How much
   support you want" card by clicking through Full Support → Guided Blend → Target Focus → Immersion;
   the reviewed phrase refolds its familiar line at the later stages. Say: "Ningua is a routine
   communication aid; a professional interpreter stays one tap away."

2. **Sign in** — http://localhost:5173/sign-in  \
   Enter any work email, e.g. `demo@hospital.example`, and click Continue. The dev token flow signs
   you in and drops you into onboarding. For a returning user, the same email continues straight into
   the app instead of onboarding.

3. **Onboarding** — first run only  \
   Pick your language (English), pick patient language(s) (e.g. Spanish), pick pace + privacy, set
   a weekly goal and choose a support stage if you want. Save → lands on Home. Say: "This sets your
   direction and your defaults; everything except goal/stage/photo/theme is your account settings."
   Tip for a fresh profile: if you want a clean live take, use a fresh work email you have not signed
   in with before so onboarding runs again.

4. **Home** — Continue card + modules  \
   If you have a recent conversation, show the Continue card with the full direction line and the
   stage chip. Otherwise pick a patient language and start one. Then show the "Ready to review",
   "Suggested", and "This week" supporting cards. Say: "Home is the next action, not a scoreboard."

5. **Learn (Phrasebook)** — http://localhost:5173/phrasebook (or pick a category from Home)  \
   Browse reviewed phrases by category, search, star a phrase for review. Show the stage chip at top:
   at Target Focus / Immersion the familiar English line hides behind a "Show English" per-phrase
   reveal or one page-level toggle. Say: "Library-reviewed translations are preferred over machine
   fallback for known phrases."

6. **Review** — http://localhost:5173/review  \
   Start a short or full session from saved phrases, reveal the translation, answer "Got it" / "Again".
   Say: "Review timing lives on this device; the backend has no review endpoint."

7. **Progress (History)** — http://localhost:5173/history  \
   Switch "This week" / "All time". Show real conversation counts, turns, and language-pair evidence
   from your conversations, plus the real backend totals + pipeline health from `GET /usage`. Say:
   "Numbers come from real data; the chart is a styled table, so it is also screen-reader friendly."

8. **Profile (Settings)** — http://localhost:5173/settings  \
   Show the grouped sections: Account (upload photo, avatar picker, display name), Languages,
   Language profiles (per-language stage + weekly goal + saved count + Make active), Appearance
   (Light / Dark / System), Audio, Privacy, Account actions, and the separated Delete-all danger
   zone. Switch theme from System to Dark and back; try a photo upload and an avatar preset. Say:
   "Appearance, photo, avatar, name, stage, goal, and active profile are per-device right now; the
   backend is frozen and does not sync them yet."

9. **Session (Conversation)** — open a conversation from Home or History  \
   Show the stage chip, the next-action hint at the top, and a nurse + patient turn with both
   languages. At Target Focus / Immersion, show the per-turn "Show English" reveals. Say: "The
   patient language line never disappears — only the duplicate familiar line folds away."

## Honest scope

- Support stage, weekly goal, photo, avatar, display name, and theme are stored on this device.
  Server-side sync of those is a backend-phase item; the current backend is frozen.
- The demo backend runs with `N8N_ENABLED=false` and no vendor keys, so free-text translation
  outside the reviewed offline glossary returns 503, by design.
- Backend verification: `npm run verify:api` at `API_URL=http://localhost:8080` passes **52/52,
  1 documented warning**.
- Frontend verification: `npm run verify:ui` passes **16/16**.
- Latest frontend commit: `4547861 feat(frontend): Ningua redesign - stages, system theme, Review,
  prefs adapter, honest telemetry`.

## Troubleshooting

- **Docker not running**: start Docker Desktop and wait for the whale icon to show "Running".
- **Port busy (8080)**: the real backend only listens on :8080 in this demo. If something else
  holds :8080, stop that process, or use the Maven backend path on :8080 once it is free.
- **Port busy (5173)**: if an old Vite process is sitting on :5173 with a wrong proxy, stop it and
  restart with `cd frontend && npm run dev`. Find the process first with
  `netstat -ano | findstr ":5173"`, then `taskkill //F //PID <pid>` if needed.
- **Type-check warning about `npx tsc` at the repo root**: the repo root has a junk `tsc@2.0.4`
  shadowing the project's TypeScript. Always use the real path `cd frontend && npx tsc --noEmit`, or
  just `npm run build:frontend` from the repo root.
- **Health not 200**: confirm the real backend (not the api-mock) is the one running on :8080, and
  that `ningua-mysql` is healthy (`docker inspect -f "{{.State.Health.Status}}" ningua-mysql`).
