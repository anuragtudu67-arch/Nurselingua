# Ningua Database — MySQL 8.4 (private)

Application data for the Ningua API. The **backend is the only client** — the
frontend never touches the database (spec §11).

## Run locally

```bash
# from the repo root
docker compose up -d mysql
```

- Host/port: `localhost:3306` · Database `ningua` · User `ningua` / `changeme`
- Data persists in the `ningua-mysql` docker volume.

## Schema ownership

Flyway owns everything — migrations live in
`backend/src/main/resources/db/migration/`:

| Migration | Contents |
|---|---|
| `V1__init.sql` | 14 tables: `users · languages · language_pairs · user_language_profiles · courses · lessons · exercises · user_lesson_progress · exercise_attempts · user_skill_progress · vocabulary_items · user_vocabulary_progress · assessments · workflow_executions` |
| `V2__seed.sql` | 26 languages, 16 pairs, the English→Japanese demo course (2 modules · 6 lessons · 14 exercises) and 8 vocabulary items |

Hibernate runs with `ddl-auto: none` — it never alters the schema. utf8mb4
throughout (Japanese, Arabic, RTL flags included).

## Production (Aiven / private MySQL)

Point `SPRING_DATASOURCE_URL/USERNAME/PASSWORD` at the managed instance;
Flyway applies the same migrations on deploy. Restrict network access to the
backend service only.
