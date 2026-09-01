# Database

PostgreSQL via Prisma ORM 6.19.3 (see `docs/ARCHITECTURE-AUDIT.md` §4.3 for
why 6.x rather than the newer-but-architecturally-different 7.x/8.0-RC).

## 1. Local setup

```bash
# start just Postgres (and Redis, for rate limiting — see SECURITY.md §9)
docker compose up -d postgres redis

# copy env and point it at that container (defaults already match)
cp .env.example .env

# create the schema
npm run db:migrate

# seed demo data (admin/admin123, rohit/user123 — same as before this migration)
npm run db:seed

npm run dev
```

Without Docker: install Postgres 14+ locally, create a database, and set
`DATABASE_URL` in `.env` to point at it.

## 2. Prisma Client

`src/lib/server/prisma.ts` exports a single shared `PrismaClient` instance,
cached on `globalThis` outside production. This matters because Next.js's
dev-mode hot module reload re-evaluates modules on every edit — without the
cache, every edit would open a fresh connection pool and eventually exhaust
Postgres's connection limit. In production this app runs as a small number
of long-lived Node processes (see `docker-compose.prod.yml` — not
per-request serverless functions), so one client per process is correct.

**Connection pooling**: Prisma's default pool (sized from `DATABASE_URL`'s
`?connection_limit=` param, default `num_cpus * 2 + 1`) is enough for this
app's scale. If this is ever deployed to a platform with many concurrent
short-lived execution contexts (serverless/edge functions), revisit with an
external pooler (PgBouncer, or Prisma Accelerate) — noted here rather than
built now, since adding it prematurely is its own complexity/cost with no
current benefit.

## 3. Schema design

See `prisma/schema.prisma` for the full, commented schema. The key decision,
covered in depth in `docs/ARCHITECTURE-AUDIT.md` §4.4:

- **Fully relational**: `User`, `Client`, `Project`, `Worker`,
  `WorkerAllocation`, `Attendance`, `Document`, `ActivityLog` — real PKs
  (client-generated string ids, matching the app's existing id scheme, e.g.
  `"C1"`), FKs, `@unique` constraints, and indexes matched to actual query
  patterns (e.g. `@@index([clientId])` on `Project`/`Quote`/`Invoice` because
  the UI always filters by client; no index was added anywhere without a
  concrete read pattern behind it).
- **Singletons**: `Company` and `Subscription` are single-row tables
  (`id` pinned to `1`) — this is a single-tenant app, one company workspace.
- **`Quote`/`Invoice`**: relational header (id, unique `number`, FKs to
  `Client`/`Project`, `taxMode`/`status` as real Postgres enums, `gstRate`/
  `discount` as `Decimal`), but the nested `rooms: [{ items: [...] }]` line
  item tree stays a single `Json` column. Not the default/lazy choice — the
  seed data itself proves room/item ids are unique only *within one
  document* (room `id: 1` appears independently in three different seed
  quotes/invoices), so a normalized `Room`/`Item` table would need an
  ID-reconciliation scheme this app has never had. Every write to that
  column is still fully Zod-validated (`src/lib/validation/billing-doc.ts`,
  a discriminated union on the line item's pricing `mode`) — the tradeoff is
  "no relational query across line items," not "no validation."

**Foreign key delete behavior** (`onDelete` in `schema.prisma`), and why:

| Relation | Behavior | Why |
|---|---|---|
| `Project.clientId`, `Quote.clientId`, `Invoice.clientId` | `Restrict` | Never silently orphan or cascade-delete financial records by deleting a client. Previously (no DB) this silently corrupted references — see `docs/ARCHITECTURE-AUDIT.md` §2.10. |
| `WorkerAllocation.workerId/projectId`, `Attendance.workerId`, `Document.projectId` | `Cascade` | These are attached metadata, not financial records — deleting the parent worker/project reasonably takes them with it. |
| `Quote.projectId`, `Invoice.projectId` | `SetNull` | A quote/invoice survives a deleted project (it's still a real billing record) but becomes unlinked rather than blocking the delete or dangling. |

## 4. Document storage tradeoff

Uploaded files (`Document.fileData`, `Bytes`/`bytea`) are stored as decoded
binary directly in Postgres, matching the app's existing "data URL" pattern
(`components/views/Documents.jsx`, unchanged) rather than moving to S3/object
storage. This keeps the migration's blast radius contained to the database
layer as scoped, but it's a real limitation worth knowing before this app
scales up: every document upload/download round-trips through Postgres, and
the 8MB per-file cap (`src/lib/validation/documents.ts`, matching the
pre-existing client-side cap) exists partly *because* of this. Moving to
object storage (S3-compatible) behind a signed-URL upload flow is the natural
next step if document volume grows — noted, not built, since it would also
require a frontend change to the upload flow that's out of scope for this
pass (see `docs/ARCHITECTURE-AUDIT.md` §4.5 on why UI changes were
deliberately minimized).

## 5. Migrations

Version-controlled SQL in `prisma/migrations/` — every schema change is a
migration, never a manual `ALTER TABLE` against production.

```bash
# development — creates a new migration from your schema.prisma edits
npm run db:migrate

# production — applies existing, already-reviewed migrations. Never
# generates new ones, never prompts, never touches data outside the
# migration's own DDL.
npm run db:migrate:deploy
```

**Never** run `prisma migrate reset` (drops the whole database) or
`prisma db push` (bypasses the migration history) against anything with real
data — both are explicitly excluded from every script in this project.

## 6. Backups

See `docs/DISASTER-RECOVERY.md`.
