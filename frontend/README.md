# Ningua Frontend → https://ningua.vercel.app

Responsive web app implementing the *Ningua Frontend Experience & IA Specification*.
Vite + React + TypeScript + React Router, no heavy UI kit — a small calm design system in `src/styles.css`.

## Run

```bash
npm install
npm run dev     # http://localhost:5173 — /api proxied to :8080 (Spring Boot or api-mock)
npm run build   # production build for Vercel
```

Vercel: set `VITE_API_URL=https://api.ningua.com`. Auth panel swaps for Clerk `<SignIn/>` in production
(see `src/auth/AuthContext.tsx` + `src/pages/Auth.tsx`) — the token flow is identical.

## Map: spec → code

| Spec | Code |
|---|---|
| §2 shell, desktop rail, mobile bottom nav | `src/components/AppShell.tsx` |
| §2.5 entry logic | `src/App.tsx` Guard |
| §3 landing / how-it-works / languages / auth | `src/pages/Landing|HowItWorks|Languages|Auth.tsx` |
| §4 onboarding 5 steps + path-built | `src/pages/Onboarding.tsx` |
| §5.1 home launchpad | `src/pages/Home.tsx` |
| §5.2 learn path + explore | `src/pages/Learn.tsx` |
| §5.3 review loop | `src/pages/Review.tsx` |
| §5.4 progress insight | `src/pages/Progress.tsx` |
| §5.5 profile/settings | `src/pages/Profile.tsx` |
| §5.6 notifications | `src/pages/Notifications.tsx` |
| §6 session frame, 6 exercise patterns, feedback, async, completion | `src/pages/Session.tsx` |
| §7 components | `src/components/ui.tsx` |
| §8–9 visual + motion system | `src/styles.css` |
| §10 six interaction states | `ui.tsx` Skeleton/Empty/ErrorBox/chips + per-page usage |
| §11 API contract | `src/api/client.ts` (relative URLs, Clerk bearer) |
| §12 a11y | landmarks, focus, aria-live feedback, 44px targets, reduced-motion |

Support-stage vocabulary (Full Support, Guided Blend, Target Focus, Immersion) lives in
`src/api/client.ts` (`STAGES`) and is reused across onboarding, lessons, settings, and progress.
