# Disaster Recovery

**The Postgres data directory living on the same disk as everything else is
not a backup.** It protects against nothing — not a bad migration, a
fat-fingered `DELETE`, disk failure, or the host disappearing. Everything
below is about a copy of the data that's actually independent of the
running database.

## Backup strategy

**Automated backups**: run `pg_dump` on a schedule, writing somewhere other
than the Postgres data directory:

```bash
pg_dump -U teakworks -h localhost -d furniture_db --format=custom \
  > "backup-$(date +%Y%m%d-%H%M%S).dump"
```

(On Windows, `pg_dump.exe` ships alongside the PostgreSQL install, e.g.
`C:\Program Files\PostgreSQL\18\bin\pg_dump.exe` — use Task Scheduler for
the recurring job; on Linux/macOS, cron.)

Ship that file off the host immediately (S3/GCS/equivalent, or at minimum a
different disk) — a backup that lives next to the thing it's backing up
survives none of the failure modes that matter. If using a managed Postgres
provider (RDS/Cloud SQL/Neon/etc.) instead of a self-hosted instance, prefer
its built-in automated-backup feature over a hand-rolled `pg_dump` cron.

**Retention**: keep daily backups for at least 14 days and weekly backups for
at least 3 months, adjusted to actual compliance/business requirements for
financial records (this app stores GST invoices — check applicable
recordkeeping requirements for the jurisdiction it's used in; that's a
business/legal decision, not one this document makes).

**Point-in-time recovery**: not configured out of the box (would need
Postgres WAL archiving set up, e.g. via `wal-g`/`pgbackrest`, or a managed
provider's built-in PITR). If recovery granularity finer than "the last
daily backup" matters for this deployment, use a managed Postgres provider
with PITR built in rather than hand-rolling WAL archiving.

**Offsite**: backups must land somewhere other than the machine running
Postgres — see the `pg_dump` command above; the "ship it off the host" step
is not optional.

## Restore procedure

```bash
# stop the app so nothing writes during restore (see docs/DEPLOYMENT.md
# for the exact command for however it's running — pm2 stop teakworks,
# systemctl stop teakworks, etc.)

# restore into a fresh/emptied database
pg_restore -U teakworks -h localhost -d furniture_db --clean --if-exists \
  backup-YYYYMMDD-HHMMSS.dump

# bring the app back up and verify
curl -f http://127.0.0.1:3000/api/ready
```

## Restore testing

An untested backup is a hope, not a backup. Periodically (recommended:
monthly, or before any major migration) restore the latest backup into a
throwaway Postgres database and confirm:

- `prisma migrate deploy` reports the migration history matches what's
  expected (no drift between the backup's schema and the current
  `prisma/migrations/`).
- Row counts for `users`, `clients`, `quotes`, `invoices` look sane against
  what's expected from the source system.
- The app actually starts against the restored data and `/api/ready`
  returns `200`.

## Recovery objectives

Stated here so they're a deliberate choice, not an assumption:

- **RPO (Recovery Point Objective)** — how much data loss is acceptable —
  is bounded by backup frequency. With daily `pg_dump`s, RPO is up to 24
  hours. Tighten this (more frequent dumps, or WAL-based PITR) if 24 hours
  of lost quotations/invoices/attendance data is not acceptable for the
  business using this app.
- **RTO (Recovery Time Objective)** — how long restore actually takes —
  depends on database size and where the backup lives; measure it the first
  time you do a restore test above and record the number here once known.
  For a database this app's size (a handful of tables, no large media beyond
  document uploads), expect low minutes, not hours — but verify rather than
  assume.

## Disaster recovery, not just backup restore

If the entire host/environment is lost (not just the database): the app
itself is stateless and rebuildable from this Git repository (`npm ci &&
npm run build`, see `docs/DEPLOYMENT.md`) — the only irreplaceable state is
the Postgres data (covered above) and whatever secrets (`AUTH_SECRET`,
`DATABASE_URL`'s password, `REDIS_URL`) live outside version control. Keep a
copy of production secrets in a password manager or secrets vault separate
from the host that runs them, or a fresh deploy has no way to decrypt/reuse
existing sessions (acceptable — `AUTH_SECRET` rotation just forces a
re-login, see `SECURITY.md` §17) and, more importantly, no way to connect to
the restored database without knowing its credentials.
