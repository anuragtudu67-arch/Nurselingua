# NurseLingua Frontend — React + TypeScript + Vite

The nurse-facing web app: phrasebook, two-sided conversation with library-first
translation, interpreter shortcut, history with retention, and settings. Written
with hand-authored CSS on design tokens (no heavy UI kit).

## Run

```bash
npm install
npm run dev        # http://localhost:5173, /api proxied to http://localhost:8080
npm run build      # tsc + vite production build (for Vercel)
```

The Vite dev server proxies `/api` to `process.env.VITE_API_URL` (default
`http://localhost:8080`), so browser code only ever uses relative URLs. To match a
backend on another port:

```bash
VITE_API_URL=http://localhost:8081 npm run dev
```

Vercel: set `VITE_API_URL=https://<your-api>` and keep `frontend/` as the root
directory. `vercel.json` provides SPA rewrites (so `/terms` survives a refresh)
and security headers.

## Auth

`src/auth/AuthContext.tsx` attaches a bearer token to every protected call.

* **Local demo:** any email signs in; the context issues a `dev.<email>` token the
  backend's dev shim accepts (`NURSELINGUA_DEV_AUTH=true`).
* **Production:** swap the demo token for a Clerk session token
  (`clerk.session.getToken()`); the request flow is otherwise identical. The client
  never sends a trusted user id — identity comes from the verified token server-side.

## Routes and code map

| Route | Page |
|---|---|
| `/` | `pages/Landing.tsx` |
| `/sign-in`, `/sign-up` | `pages/Auth.tsx` |
| `/onboarding` | `pages/Onboarding.tsx` |
| `/home` | `pages/Home.tsx` |
| `/conversation` | `pages/NewConversation.tsx` |
| `/conversation/:id`, `/history/:id` | `pages/Conversation.tsx` |
| `/phrasebook` | `pages/Phrasebook.tsx` |
| `/history` | `pages/History.tsx` |
| `/settings` | `pages/Settings.tsx` |
| `/interpreter` | `pages/Interpreter.tsx` |
| `/terms`, `/privacy` | `pages/Legal.tsx` |

Supporting code: `App.tsx` (routes + `Guard` entry logic), `components/AppShell.tsx`
(shell, desktop rail, mobile nav), `components/icons.tsx` (inline SVG icon set),
`components/ui.tsx` (skeletons, empty/error states), `src/api/client.ts` (typed
`/api/v1` contract, mirroring `docs/API.md`), `src/state/StoreContext.tsx` (data
layer with an offline demo fallback).

## Appearance

Light is the default; **Dark** and **System** are opt-in from Settings → Appearance.
The choice is persisted in `localStorage` (`src/theme.ts`) and applied to
`<html data-theme>` by an inline script in `index.html` before first paint, so there
is no theme flash. The backend settings contract has no theme field, so this is a
client-side preference; when one is added, only `getPref`/`setPref` change.

## Design constraints

Enforced by `npm run verify:ui` at the repo root, not left to review: inline SVG
icons only (no emoji), no em dashes in user-visible copy, no pill-shaped buttons, no
purple hues (clinical teal + patient blue), no `<img>` tags at all, no invented
metrics or testimonials, minimum 44px touch targets, visible focus rings, a skip
link and `<main id="main">` on every route, and `prefers-reduced-motion` support.
