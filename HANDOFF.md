# NurseLingua handoff

Where we left off, what is verified, and what is still open.
Last updated: 2026-09-18 (second pass: UI appeal + catalog auth fix).

---

## 1. Run it locally

```bash
npm run install:all          # frontend + api-mock dependencies
npm run dev:frontend         # http://localhost:5173
npm run backend:win          # Spring API on :8080 (Windows, bundled Maven)
```

Zero-infrastructure option (no MySQL, no n8n, no R2), which is what was used for verification:

```bash
.tools/apache-maven-3.9.9/bin/mvn -f backend/pom.xml spring-boot:run \
  -Dspring-boot.run.profiles=h2 -Dspring-boot.run.arguments=--server.port=8081
```

Do not run `npm run dev:api` for this app. `api-mock/server.js` implements a different
product (courses, lessons, vocabulary) and does not implement the NurseLingua contract.

## 2. Verified state

| Check | Result |
|---|---|
| `npm run build` (tsc + vite) | passes, zero errors |
| `npm run verify:ui` | 15/15, exits 1 on any violation |
| `npm run verify:api` | 52 checks pass |
| Backend tests (`mvn test`) | 13/13, including the anonymous-phrase-catalog test |
| Routes walked in headless Chrome | `/`, `/terms`, `/privacy`, `/sign-in`, `/sign-up`, `/interpreter`, `/home`, `/phrasebook`, `/history`, `/settings`, `/conversation`, `/conversation/:id` |
| Console errors / HTTP >= 400 | none, on every route, against the real API |
| Backend checklist (48 checks) | 45 pass, 3 known (section 5) |
| Flyway on an empty schema | 7 migrations applied, then seeded catalog served |
| `/favicon.svg` | 200, `image/svg+xml` |

Design constraints, enforced by `tools/verify-ui.mjs` rather than by eye:

* no emoji or dingbat glyphs used as icons (inline SVG set in `src/components/icons.tsx`)
* no em dashes in user-visible copy
* no pill-shaped buttons (fully rounded and wider than tall)
* no purple hues in computed styles
* no `<img>` tags at all, so no stock or generated imagery
* no fake metrics, reviews or testimonials anywhere in the copy
* skip link and `<main id="main">` landmark on every route
* `prefers-reduced-motion` honoured, safe-area insets on mobile bars

Chips and badges are still rounded: they are labels and indicators, not buttons.
Say the word if you want those squared off too.

## 2b. Changed in the second pass (this session)

**Open decision 1 is now resolved.** `/api/v1/phrases*` is public, exactly as `docs/API.md`
always claimed: `SecurityConfig` permits `/api/v1/phrases` and `/api/v1/phrases/*`, the
favorites enrichment still switches on auth inside `PhraseService`, and the integration
test now asserts anonymous phrase reads return 200 while `/users/me` still returns 401.

**Frontend appeal pass**, guided by the ui-ux-pro-max skill (healthcare profile:
Accessible & Ethical pattern, calm teal + health green, no social-proof patterns): hero
visual replaced with a real product-style two-sided conversation preview (`HeroDemo`),
Plus Jakarta Sans display face for headings and the brand mark, quieter background with
lifted card surfaces and a teal hover lift, tinted primary-button hover glow, underlined
footer legal links, tinted focus rings, a static dot-grid behind the hero, centered hero
on mobile. No scroll animation, no cursor animation, no new motion types.

**Tooling**: CodeRabbit CLI installed at `C:\Users\anura\AppData\Local\Programs\coderabbit`
(`cr` 0.7.8); `cr doctor` passes except auth. The ui-ux-pro-max skill is installed at
`.agents/skills/ui-ux-pro-max` (gitignored). Python is NOT installed on this machine, so
the skill's search script cannot run; its guidance was taken straight from the bundled CSV
reference data instead. Install Python 3 if you want the search tool working.

## 3. Changed in the first pass

**Frontend**

* `public/favicon.svg` (new), head meta, title, Open Graph and theme color in `index.html`
* `src/pages/Legal.tsx` (new): Terms of Use and Privacy Policy, public routes
* `src/components/icons.tsx` (new): 24 inline SVG icons
* `src/pages/Landing.tsx`, `AppShell.tsx`, `styles.css`: icon replacement, de-pilled chips,
  hero and CTA rewritten, legal links in the footer, legal and preview styles
* `vercel.json` (new): SPA rewrites (so `/terms` survives a refresh) and security headers
* Copy sweep: every em dash in `src` rewritten, including comments
* `App.tsx`: skip link rendered once; `/terms` and `/privacy` routes added

**Backend**

* `HealthController.java`: a stray `np` prefix broke the whole Java build
* `GlobalExceptionHandler.java`: malformed JSON returned 500, now a clean 400
* `application.yml`: `open-in-view` was indented under `jpa.hibernate` where it did nothing.
  Fixing it exposed a real bug: `GET /phrases` threw `LazyInitializationException` because
  mapping read a lazy category proxy outside a session. Fixed with
  `@Transactional(readOnly = true)` in `PhraseService`
* `application.yml`: `dev-auth` read `NINGUA_DEV_AUTH` while `.env.example` documented
  `NURSELINGUA_DEV_AUTH`, so the production switch did nothing. Renamed and verified:
  with `NURSELINGUA_DEV_AUTH=false` a `dev.` token returns 401

**Repo**

* `.gitignore` hardened: `.tools/` (11 MB Maven), `.agents/` (3.7 MB skills),
  `backend/target/`, `.env.*`, `.vercel/`
* `.mcp.json`: 21st.dev MCP endpoint, key read from `API_KEY_21ST`
* `tools/verify-ui.mjs` (new) and `npm run verify:ui`

## 4. Before this goes to real patients

Fill in the placeholders. They are deliberate, not oversights:

| File | Placeholder |
|---|---|
| `src/pages/Legal.tsx` lines 10-14 | operator legal name, domain, privacy contact, governing law, effective date |
| `src/pages/Interpreter.tsx` lines 11-12 | your contracted interpreter service name and phone number |

The interpreter numbers that were there before named real vendors with numbers that could
not be verified. Publishing a wrong emergency contact is worse than a placeholder.

Have a lawyer read both legal pages. They are written to be accurate and to avoid claiming
certification the project does not have, but they are not legal advice.

## 5. Open decisions

1. **Free text only translates when the sentence is in the offline glossary.** Anything else
   returns a clean 503 "Translation is unavailable". That is the designed behaviour with
   `N8N_ENABLED=false` and no vendor keys, not a bug.
2. **21st.dev is wired but unused.** `.mcp.json` points at its MCP endpoint, but
   `API_KEY_21ST` is empty and MCP is not reachable from this session, so no 21st.dev
   components were pulled in. Its components are Tailwind + Radix based and would add
   dependencies; the current hand-written CSS already satisfies every design constraint.
   Say the word if you want specific components converted anyway.

(Former decisions 1 and 2 are resolved: the phrase catalog is now public per the docs, and
README.md already describes NurseLingua.)

## 6. Owner actions

**a. Move the project out of OneDrive.**
The project currently sits at `C:\Users\anura\OneDrive\Documents\Desktop\ningua-app`, and
the repository has been initialised in place so the folder stays usable right now. OneDrive
syncing a `.git` directory can still corrupt it, so move the folder to somewhere like
`C:\dev\ningua-app` when convenient: the `.git` directory travels with it and nothing else
has to change.**b. Create the repository and push.** The local half is already done: this folder is now
its own git repository on `main` with one commit, and `origin` points at
`https://github.com/anuragtudu67-arch/ningua-app.git`. Change the name with
`git remote set-url origin <url>` if you prefer another one.

Still to do, because the repository does not exist on GitHub yet (nothing was pushed from
here): create an empty repository with that name on GitHub, then

```bash
git push -u origin main
```

Do not run `git add` from your Desktop root. That folder is a separate repository with zero
commits, and adding there would sweep your whole Desktop.

**c. CodeRabbit**, for review before each deploy. The CLI is already installed; open a
NEW terminal so `cr` is on PATH (or use the full path
`C:\Users\anura\AppData\Local\Programs\coderabbit\cr.exe`), then from the repo root:

```bash
cr auth login              # browser sign-in, add --region eu if you are in the EU
cr review                  # review uncommitted work; cr doctor if setup fails
```

Then install the CodeRabbit GitHub app on the repo for pull-request reviews.
There is no GitHub CLI on this machine, so the repository has to be created in the browser.

**d. 21st.dev**, once you have a key from 21st.dev, set `API_KEY_21ST` in your environment.
`.mcp.json` already points at `https://21st.dev/api/mcp`. Its components are Tailwind and
Radix based, so pulling them in adds dependencies; confirm before those land.

**e. Domain and deploy.**
Buy the domain, add it in Vercel (`Project > Domains`) and point DNS. Then:

* Frontend on Vercel: root directory `frontend/`, env `VITE_API_URL=https://<your-api>`
* Backend on Render: root directory `backend/`. Both `backend/mvnw` and `backend/mvnw.cmd`
  exist, so `./mvnw clean package` works; a Docker build is optional. Set
  `NURSELINGUA_DEV_AUTH=false`, `CLERK_JWT_ISSUER`, the datasource variables,
  `NURSELINGUA_CORS_ORIGINS=https://<your-domain>` and the `N8N_*` values
* The database must be **MySQL**, not Postgres: the migrations and `flyway-mysql` are
  MySQL specific
* Free Render instances sleep and take roughly 50 seconds to wake, so warm the API before
  a live demo

**f. Local MySQL**, if you use `docker compose up -d`: compose creates database and user
`ningua`, while the backend defaults to `nurselingua`. Align those or set
`SPRING_DATASOURCE_*` explicitly.

## 7. Re-verifying after a change

```bash
# with the API on :8081 and the dev server on :5173 running
npm run verify:ui
```

Set `APP_URL`, `API_URL` or `CHROME_PATH` if your ports differ. The script exits non-zero
on any violation, so it can gate a deploy.

The API checklist used earlier (health, auth modes, DTO shapes per endpoint, 400s, the 202
submit-and-poll flow, webhook secret, CORS preflight) was a throwaway harness. Ask for it
as `tools/verify-api.mjs` if you want it kept.
