# Show this in IntelliJ — cheat sheet

## First time (5 min)
1. Install **Node.js 20 LTS** from nodejs.org (skip if `node --version` works in a terminal).
2. In IntelliJ: **File → Open…** → select the `ningua-app` folder → **Trust Project**.
3. Open the built-in terminal (`Alt+F12`) and run:
   ```
   npm run install:all
   ```

## Every demo (1 min)
- **Option A — press play (IntelliJ Ultimate):** top-right run menu → ▶ `1 - Demo API (:8080)`,
  then ▶ `2 - Frontend (:5173)`. (IntelliJ Community: use Option B.)
- **Option B — terminal (works in every edition):**
  ```
  npm run dev:api        # terminal tab 1
  npm run dev:frontend   # terminal tab 2
  ```
- Open **http://localhost:5173** in the browser. Sign in with any email.

## 5-minute supervisor path
Landing → Sign up → 5-step onboarding → **Build my path** → Home → **Continue learning**
→ in the lesson open **⚙** and flip support stages (translations appear/disappear —
this is the core idea) → Review → Progress → Profile → `backend/README.md` for Phase 2.

## If something fails
- `node` not found → install Node 20 LTS, restart IntelliJ.
- Port busy → close the old terminal tabs / stop the run configs, start again.
- No internet for `npm install`? The `frontend` still builds offline after one install.
