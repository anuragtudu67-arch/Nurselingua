# NurseLingua Database — MySQL 8.4

Application data for the NurseLingua API. The **backend is the only client** — the
frontend never touches the database.

## Run locally

```bash
# from the repo root
docker compose up -d mysql
```

- Host/port: `localhost:3306`
- Database `nurselingua` · User `nurselingua` / `changeme`
- Data persists in the `ningua-mysql` docker volume

These definitions live in `docker-compose.yml`. They match the backend's
`SPRING_DATASOURCE_*` defaults and `.env.example`, so no overrides are needed. If you
already created a volume under the old `ningua` name, recreate it once with
`docker compose down -v && docker compose up -d mysql`.

For the zero-infrastructure option (no MySQL, no n8n, no R2), skip this and run the
backend's in-memory profile:

```bash
.tools/apache-maven-3.9.9/bin/mvn -f backend/pom.xml spring-boot:run -Dspring-boot.run.profiles=h2
```

## Schema ownership

Flyway owns everything. Migrations live in
`backend/src/main/resources/db/migration/`:

| Migration | Contents |
|---|---|
| `V1__init.sql` | 12 tables: `users · languages · phrase_categories · phrases · phrase_translations · conversations · conversation_turns · favorites · recents · usage_events · workflow_executions · user_settings` |
| `V2__seed.sql` | 9 languages (`en` + patient `es, hi, bn, fr, ar, zh, ta, ur`) and 5 phrase categories |
| `V3__phrases.sql` | 72 reviewed phrases across the 5 categories |
| `V4`–`V7` | 576 translations (72 phrases × the 8 patient languages), with romanization for every non-Latin script |

Hibernate runs with `ddl-auto: none` — it never alters the schema. `utf8mb4`
throughout (Arabic and Urdu RTL flags included). There are no diagnosis, treatment,
or clinical-decision columns anywhere.

## Production (managed MySQL)

Point `SPRING_DATASOURCE_URL/USERNAME/PASSWORD` at the managed instance; Flyway
applies the same migrations on deploy. The database must be **MySQL**, not Postgres
(the migrations and `flyway-mysql` are MySQL specific). Restrict network access to the
backend service only.
