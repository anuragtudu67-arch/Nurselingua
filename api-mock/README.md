# Ningua API Mock (local demo only)

Runnable stand-in for the Spring Boot API implementing the **same `/api/v1` contract**
(same paths, same shapes, same 202-then-poll async pattern for speech/writing).

```bash
npm install
npm start   # :8080
```

The frontend (vite proxy `/api → :8080`) works unchanged against this or the real
Spring Boot backend. Mock accepts any `Authorization: Bearer …` token; Spring verifies
real Clerk JWTs. To use Spring instead: stop this process and run `backend` on :8080.
