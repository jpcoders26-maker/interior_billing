# Docker

## Images

`Dockerfile` is a 3-stage build:

1. **`deps`** — installs dependencies. Includes `python3 make g++` (Alpine
   has no prebuilt binary for `argon2`'s native addon, so it compiles during
   `npm ci`) — this stage's toolchain never reaches the final image.
2. **`builder`** — runs `prisma generate` then `next build`. Uses a
   placeholder `DATABASE_URL` (see SECURITY.md §11) purely so Next can
   statically analyze route modules; nothing queries the DB at build time.
3. **`runner`** — the actual runtime image. Copies only: the Next.js
   `standalone` server output (`.next/standalone`, `output: "standalone"` in
   `next.config.ts`), static assets (`.next/static`), the generated Prisma
   client (`node_modules/.prisma` + `node_modules/@prisma/client` — copied
   explicitly because Next's dependency tracer doesn't reliably pick up
   Prisma's native query-engine binary through the standalone bundler), and
   `prisma/` (for running migrations from inside the container if needed).
   Runs as a non-root `nextjs` user (uid 1001).

## Development

```bash
# option 1 (recommended): just the dependencies, run Next.js on the host
docker compose up -d postgres redis
npm run dev            # hot reload

# option 2: the whole stack in containers (no local Node/Postgres/Redis needed)
docker compose up --build
```

Postgres's port is published to `localhost` in `docker-compose.yml` (dev
only) so you can point a DB client at it directly.

## Production

```bash
# build
docker compose -f docker-compose.prod.yml build

# apply migrations — a separate, explicit step, never automatic on container
# start (see "Migrations in Docker" below for why)
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

# start
docker compose -f docker-compose.prod.yml --profile with-db up -d
# (omit --profile with-db if you're pointing DATABASE_URL at a managed
# Postgres instead of the bundled container — see docker-compose.prod.yml's
# header comment)

# check
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app

# stop
docker compose -f docker-compose.prod.yml down
```

`docker-compose.prod.yml` requires `DATABASE_URL`, `AUTH_SECRET`,
`REDIS_PASSWORD`, and (if using the bundled Postgres) `POSTGRES_USER`/
`POSTGRES_PASSWORD` from the environment — it has no insecure defaults for
any of them, and will refuse to start without them (Compose's `${VAR:?err}`
syntax). Put these in a real `.env.production` file that is **never**
committed (see `.env.example` for the full list and `SECURITY.md` §11).

### Migrations in Docker

Migrations are a deliberately separate step from starting the app (Phase 35
of the original brief): if multiple app containers started simultaneously
and each tried to run migrations on boot, they could race. The sequence is
always: build → migrate (once, explicitly) → start containers → healthcheck.
Never run `prisma migrate dev` (development-only, creates a shadow DB) or
`prisma migrate reset` (drops data) against production — only
`prisma migrate deploy`.

### Updating a running deployment

```bash
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d app
```

The `HEALTHCHECK` in `Dockerfile` (and `docker-compose.prod.yml`'s own
healthcheck, which additionally verifies DB connectivity via `/api/ready`)
means `docker compose up -d` won't report the service healthy until it's
actually able to serve traffic — check `docker compose ps` after updating.

### Destructive commands — never run these against production without meaning to

```bash
docker compose -f docker-compose.prod.yml down -v   # -v deletes the named volumes (Postgres/Redis data)
docker compose -f docker-compose.prod.yml exec postgres psql ... 'DROP ...'
prisma migrate reset
```

## Networking

Postgres and Redis publish **no ports** to the host in
`docker-compose.prod.yml` — reachable only over the internal Compose network
(`postgres:5432`, `redis:6379` from the app's perspective). The app itself
binds to `127.0.0.1:3000` on the host, not `0.0.0.0` — put a reverse proxy
(nginx/Caddy/Traefik) in front for TLS termination and public exposure. This
repo doesn't include one, since the right choice and its certificate setup
(Let's Encrypt via the proxy vs. a managed load balancer's TLS) is
environment-specific — see `docs/DEPLOYMENT.md`.

## Graceful shutdown

`src/instrumentation.ts` registers `SIGTERM`/`SIGINT` handlers that close the
Prisma connection pool cleanly before the process exits — this is what
Docker/an orchestrator sends on `docker stop`/a rolling update, and the
container is run with `CMD ["node", "server.js"]` directly (not via `npm
start`, which would sit as an extra process between Docker and the app and
not forward the signal correctly) so the handler actually receives it as
PID 1.

## Resource limits

`docker-compose.prod.yml` sets `deploy.resources.limits`/`reservations` on
every service — a misbehaving container can't starve the others on a shared
host. Tune these to the actual instance size in production; the defaults
here are conservative starting points for a small internal-tool deployment,
not a load-tested figure.
