# Deployment

This app deploys as a plain Node.js process — no Docker. `npm run build`
produces a standard Next.js production build; `npm run start` runs it.
Everything below is about running that reliably in production: process
management, migrations, TLS, and CI.

## Environment variables (production)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | `postgresql://user:pass@host:5432/db?schema=public`. Use a role scoped to this app's schema, not a shared superuser (see `docs/DATABASE.md`). |
| `AUTH_SECRET` | yes | `openssl rand -base64 48`. The app refuses to sign/verify sessions without this in production (`NODE_ENV=production`) — see `SECURITY.md` §2. |
| `REDIS_URL` | strongly recommended | Distributed rate limiting (`SECURITY.md` §9). Without it, rate limiting falls back to a per-instance in-memory counter that doesn't work correctly across more than one app process — the app logs a warning if it boots this way in production. |
| `NODE_ENV` | yes | `production`. |
| `PORT` | no | Defaults to `3000`. |
| `NEXT_PUBLIC_APP_NAME` | no | Pre-login screen / browser-tab title only; not a secret. |

See `.env.example` for the full annotated list. Set these as real
environment variables on the server (or in your process manager's config —
see below), never in a committed file.

## Build and run

```bash
npm ci
npm run db:migrate:deploy   # apply migrations — see "Migrations" below
npm run build
npm run start                # listens on PORT (default 3000)
```

Running `npm run start` directly in a terminal works, but it dies when that
terminal closes and won't restart itself if the process crashes — use a
process manager for anything actually left running.

### Process manager: PM2 (recommended — works the same on Windows/Linux/macOS)

```bash
npm install -g pm2
pm2 start npm --name teakworks -- run start
pm2 save                      # persist the process list
pm2 startup                   # prints the command to auto-start PM2 on boot
```

```bash
pm2 restart teakworks         # after a deploy
pm2 logs teakworks
pm2 stop teakworks
```

PM2 sends `SIGINT` on stop/restart, which `src/instrumentation.ts` already
handles — the app closes its database connections cleanly before exiting
(see `docs/ARCHITECTURE.md` "Graceful shutdown").

### Alternative: systemd (Linux servers)

```ini
# /etc/systemd/system/teakworks.service
[Unit]
Description=Teakworks Furniture Billing System
After=network.target postgresql.service

[Service]
Type=simple
User=teakworks
WorkingDirectory=/opt/teakworks
EnvironmentFile=/opt/teakworks/.env.production
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Run as a **dedicated, non-root user** (`User=teakworks` above) — never run
the app as `root`. `EnvironmentFile` keeps secrets out of the unit file
itself; that file should be readable only by the `teakworks` user
(`chmod 600`).

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now teakworks
sudo systemctl status teakworks
journalctl -u teakworks -f
```

## Migrations

Always a separate, explicit step before (re)starting the app — never
automatic on process start, and never `prisma migrate dev` or
`prisma migrate reset` outside development:

```bash
npm run db:migrate:deploy
```

## TLS / reverse proxy

The app itself doesn't terminate TLS — put a reverse proxy in front (nginx,
Caddy, or IIS on Windows) bound to 80/443, proxying to the app's `PORT`
(default 3000) on `127.0.0.1`. Forward `X-Forwarded-For` from the proxy so
`src/lib/server/rate-limit.ts`'s `clientIp()` sees the real client IP rather
than the proxy's. The `Strict-Transport-Security` header the app already
sets (`next.config.ts`, see `SECURITY.md` §10) assumes TLS is terminated
somewhere in front of it — it's a no-op over plain HTTP.

A minimal nginx example:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.example;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request (this uses a
Postgres *service container* on GitHub's own hosted runner — that's
GitHub's infrastructure, not something you need Docker installed locally
for):

1. `lint-and-typecheck` — `npm run lint`, `npm run typecheck`.
2. `security-audit` — `npm audit` (report-only, see `SECURITY.md` §18) and a
   TruffleHog scan for committed secrets.
3. `test-and-build` — spins up a disposable Postgres service container,
   applies migrations for real (`prisma migrate deploy`), runs the full test
   suite (unit + DB integration tests — see `docs/ARCHITECTURE-AUDIT.md` §5
   for why the integration tests can only run in CI/against a real DB, not in
   this project's own dev sandbox), then a production build.

Nothing in this workflow deploys anywhere — it's a merge gate, not a deploy
pipeline. Wire an actual deploy step (e.g. an SSH step that pulls, runs
`npm ci && npm run build`, applies migrations, then `pm2 restart teakworks`
or `systemctl restart teakworks`) to whatever server this app ends up
hosted on, gated on `test-and-build` succeeding — never bundle a destructive
migration command into an automatic pipeline without a manual approval gate
in front of it.

## Rollback

There's no automated rollback in this repo (no deploy pipeline exists yet to
roll back). Manually: check out the previous release's commit, `npm ci &&
npm run build`, restart the process. If the migration between versions was
additive (new nullable column, new table), the old code keeps working
against the new schema. If it wasn't (a column was dropped/renamed), you
need a corresponding down-migration or a restore from backup — see
`docs/DISASTER-RECOVERY.md`. Write migrations to be additive and
backward-compatible with the previous release wherever practical, precisely
so rollback stays simple.

## Health checks for a load balancer / process manager

- Liveness: `GET /api/health` — process is up, no dependency checks.
- Readiness: `GET /api/ready` — actually queries Postgres; `503` if
  unreachable. Route traffic based on this one, not `/api/health`.

## Troubleshooting

- **App won't start, logs show `AUTH_SECRET is required in production`**:
  it's missing from the environment — see the table above.
- **`Authentication failed against database server` / Prisma can't
  connect**: `DATABASE_URL`'s user/password don't match what actually
  exists in the target Postgres instance. This usually means Postgres was
  already running (a native install, a colleague's setup, a previous
  project) with different real credentials than what's in `.env` — see
  `docs/DATABASE.md` §1 for how to create the exact role/database the app
  expects, or point `DATABASE_URL` at whatever role you already have.
- **App can't reach Postgres at all (connection refused)**: confirm
  Postgres is actually running (`pg_isready`, or check the service —
  `Get-Service postgresql*` on Windows, `systemctl status postgresql` on
  Linux) and that migrations have been applied
  (`npm run db:migrate:deploy`).
- **Rate limiting seems inconsistent across requests**: check `REDIS_URL` is
  set and Redis is reachable — logs will show `"Redis connection error"` if
  not, and the app is silently running each instance's own in-memory counter.
