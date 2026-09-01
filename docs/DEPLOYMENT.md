# Deployment

## Environment variables (production)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/db?schema=public`. Use a role scoped to this app's schema, not a shared superuser (see `docs/DATABASE.md`). |
| `AUTH_SECRET` | yes | `openssl rand -base64 48`. The app refuses to sign/verify sessions without this in production (`NODE_ENV=production`) — see `SECURITY.md` §2. |
| `REDIS_URL` | strongly recommended | Distributed rate limiting (`SECURITY.md` §9). Without it, rate limiting falls back to a per-instance in-memory counter that doesn't work correctly with more than one app container — the app logs a warning if it boots this way in production. |
| `NODE_ENV` | yes | `production`. |
| `NEXT_PUBLIC_APP_NAME` | no | Pre-login screen / browser-tab title only; not a secret. |

See `.env.example` for the full annotated list.

## Deploying with Docker Compose

See `docs/DOCKER.md` for the complete command sequence (build → migrate →
start → verify). Short version:

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml --profile with-db up -d
curl -f http://127.0.0.1:3000/api/ready
```

## Deploying without the bundled Postgres/Redis (managed services)

Omit `--profile with-db` and point `DATABASE_URL` at your managed Postgres
(RDS, Cloud SQL, Neon, etc.) and `REDIS_URL` at your managed Redis
(ElastiCache, Upstash, etc.). The `redis` service in `docker-compose.prod.yml`
can also be dropped the same way if you're using a managed Redis — the app
only needs a reachable `REDIS_URL`, not the specific container.

## TLS / reverse proxy

The app binds to `127.0.0.1:3000` in `docker-compose.prod.yml` — it does not
terminate TLS itself. Put a reverse proxy in front (nginx, Caddy, Traefik) or
a cloud load balancer, and set the `Strict-Transport-Security` header's
`max-age` expectations accordingly (already set at the app level in
`next.config.ts` — see `SECURITY.md` §10). Forward `X-Forwarded-For` from the
proxy so `src/lib/server/rate-limit.ts`'s `clientIp()` sees the real client
IP rather than the proxy's.

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request:

1. `lint-and-typecheck` — `npm run lint`, `npm run typecheck`.
2. `security-audit` — `npm audit` (report-only, see `SECURITY.md` §18) and a
   TruffleHog scan for committed secrets.
3. `test-and-build` — spins up a disposable Postgres service container,
   applies migrations for real (`prisma migrate deploy`), runs the full test
   suite (unit + DB integration tests — see `docs/ARCHITECTURE-AUDIT.md` §5
   for why the integration tests can only run in CI/against a real DB, not in
   this project's own dev sandbox), then a production build.

Nothing in this workflow deploys anywhere — it's a merge gate, not a deploy
pipeline. Wire an actual deploy step (or a separate `cd.yml`) to whatever
target this app ends up hosted on, gated on `test-and-build` succeeding, and
have it run `prisma migrate deploy` as its own step before restarting the
app — never bundle a destructive migration command into an automatic
pipeline without a manual approval gate in front of it.

## Rollback

There's no automated rollback in this repo (no deploy pipeline exists yet to
roll back). Manually: redeploy the previous image tag; if the migration
between versions was additive (new nullable column, new table), the old
image keeps working against the new schema. If it wasn't (a column was
dropped/renamed), you need a corresponding down-migration or a restore from
backup — see `docs/DISASTER-RECOVERY.md`. Write migrations to be additive and
backward-compatible with the previous release wherever practical, precisely
so rollback stays simple.

## Health checks for a load balancer / orchestrator

- Liveness: `GET /api/health` — process is up, no dependency checks.
- Readiness: `GET /api/ready` — actually queries Postgres; `503` if
  unreachable. Route traffic based on this one, not `/api/health`.

## Troubleshooting

- **App container unhealthy, logs show `AUTH_SECRET is required in
  production`**: it's missing from the environment — see the table above.
- **App can't reach Postgres**: confirm `DATABASE_URL`'s host matches the
  Compose service name (`postgres`, not `localhost`) when running inside
  Docker, and that migrations have actually been applied
  (`prisma migrate deploy`).
- **Rate limiting seems inconsistent across requests**: check `REDIS_URL` is
  set and Redis is reachable — logs will show `"Redis connection error"` if
  not, and the app is silently running each instance's own in-memory counter.
