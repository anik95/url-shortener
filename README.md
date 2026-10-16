# URL Shortener

A small REST API that turns long URLs into 8-character short codes, redirects visitors, and counts every click.

## API

| Method | Path                     | What it does                                                  |
| ------ | ------------------------ | ------------------------------------------------------------- |
| POST   | `/urls/shorten`          | Body `{ "url": "https://..." }` → `{ shortUrl, originalUrl }` |
| GET    | `/urls/:shortCode`       | 302 redirect to the original URL, records a click             |
| GET    | `/urls/:shortCode/stats` | Original URL, total clicks, and each click's timestamp        |

Errors: invalid or unknown body fields → `400` with the reasons; unknown short code → `404`.

## Stack

- **NestJS**: modules and dependency injection keep the database, cache and HTTP layers separate; `ValidationPipe` + `class-validator` reject bad input before it reaches the handler.
- **PostgreSQL 18**: the source of truth. A unique constraint on `short_code` catches collisions, and `uuidv7()` gives time-ordered IDs.
- **Drizzle ORM**: typed queries that stay close to SQL, plus versioned migrations in `drizzle/`.
- **Redis**: caches code → URL lookups for 24h so redirects skip the database.
- **nanoid**: random URL-safe codes; on the rare collision the insert retries with a new code.
- **Docker**: multi-stage build for a lean runtime image; Compose runs the app, Postgres and Redis together.

## Run locally

Requires Docker, Node 24 and pnpm 10.

```bash
git clone <repo-url> && cd url-shortener
cp .env.example .env              # fill in values, e.g. below
pnpm install

docker compose up -d db redis     # start Postgres and Redis
pnpm db:migrate                   # create the tables

docker compose up -d --build app  # run the API in Docker on :3000
# or: pnpm start:dev              # run it on your machine with hot reload
```

Example `.env`:

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=url_shortener
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/url_shortener
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379
```

`.env` uses `localhost`, which works when running the app on your machine. Inside Docker, `localhost` means the app's own container, so `compose.yaml` replaces those two URLs with the service names `db` and `redis`.

Try it:

```bash
curl -X POST localhost:3000/urls/shorten -H 'content-type: application/json' -d '{"url":"https://example.com"}'
curl -i localhost:3000/urls/<shortUrl>
curl localhost:3000/urls/<shortUrl>/stats
```

Tests (need `db` and `redis` running): `pnpm test:e2e`. Stop everything with `docker compose down`.

## What it demonstrates

- A cache-aside read path: Redis first, Postgres on a miss, then fill the cache.
- Letting the database enforce uniqueness and handling the conflict in code, instead of a check-then-insert race.
- Input validation at the API boundary with clear 400/404 responses.
- Schema migrations, environment-based config, graceful shutdown of DB and Redis connections.
- Reproducible packaging with a multi-stage Dockerfile and Docker Compose.
