# Disaster Recovery

**A Docker volume is not a backup.** It protects against the container being
removed, not against a bad migration, a fat-fingered `DELETE`, disk failure
on the host it lives on, or the host itself disappearing. Everything below
is about the thing that's actually independent of the running container.

## Backup strategy

**Automated backups**: run `pg_dump` on a schedule, independent of the
`postgres_prod_data` Docker volume:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom \
  > "backup-$(date +%Y%m%d-%H%M%S).dump"
```

Ship that file off the host immediately (S3/GCS/equivalent, or at minimum a
different disk) — a backup that lives next to the thing it's backing up
survives none of the failure modes that matter. Automate this with a cron
job or your platform's managed-backup feature if using a managed Postgres
instance instead of the bundled container (RDS/Cloud SQL automated backups
cover this natively — prefer that over a hand-rolled `pg_dump` cron if
available).

**Retention**: keep daily backups for at least 14 days and weekly backups for
at least 3 months, adjusted to actual compliance/business requirements for
financial records (this app stores GST invoices — check applicable
recordkeeping requirements for the jurisdiction it's used in; that's a
business/legal decision, not one this document makes).

**Point-in-time recovery**: not configured out of the box in
`docker-compose.prod.yml` (would need Postgres WAL archiving set up, e.g. via
`wal-g`/`pgbackrest`, or a managed provider's built-in PITR). If recovery
granularity finer than "the last daily backup" matters for this deployment,
use a managed Postgres provider with PITR built in rather than hand-rolling
WAL archiving.

**Offsite**: backups must land somewhere other than the machine running
Postgres — see the `pg_dump` command above; the "ship it off the host"
step is not optional.

## Restore procedure

```bash
# stop the app so nothing writes during restore
docker compose -f docker-compose.prod.yml stop app

# restore into a fresh/emptied database
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  < backup-YYYYMMDD-HHMMSS.dump

# bring the app back up
docker compose -f docker-compose.prod.yml start app
curl -f http://127.0.0.1:3000/api/ready
```

## Restore testing

An untested backup is a hope, not a backup. Periodically (recommended:
monthly, or before any major migration) restore the latest backup into a
throwaway Postgres instance and confirm:

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
itself is stateless and rebuildable from this Git repository plus
`docker-compose.prod.yml` — the only irreplaceable state is the Postgres
data (covered above) and whatever secrets (`AUTH_SECRET`,
`DATABASE_URL`/`REDIS_PASSWORD`) live outside version control. Keep a copy
of production secrets in a password manager or secrets vault separate from
the host that runs them, or a fresh deploy has no way to decrypt/reuse
existing sessions (acceptable — `AUTH_SECRET` rotation just forces a
re-login, see `SECURITY.md` §17) and, more importantly, no way to connect to
the restored database without knowing its credentials.
