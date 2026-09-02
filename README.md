# Teakworks — Furniture Quote-to-Cash ERP/CRM (Next.js)

Full-stack **Next.js (App Router)** ERP/CRM for furniture & interior contractors:
GST and Non-GST billing, room-wise quoting, clients, projects, labour attendance with
monthly reports, documents, subscription management, secure auth with admin-managed
users, and a uploadable company logo.

Production-hardened on **PostgreSQL + Prisma**, with Zod validation, RBAC,
Redis-backed rate limiting, and security headers — see `docs/ARCHITECTURE.md`
for the full design and `SECURITY.md` for the security posture.
`docs/ARCHITECTURE-AUDIT.md` records what this app looked like before that
work and why each decision was made. No Docker — this app runs as a plain
Node.js process; see `docs/DEPLOYMENT.md`.

## 1. Overview

- Next.js 16 (App Router, TypeScript for the server/data layer), React 19.
- PostgreSQL via Prisma ORM; every write goes through Zod validation and
  real database constraints.
- Session auth (httpOnly JWT cookie, Argon2id password hashing), RBAC
  (`admin`/`user`), Redis-backed rate limiting, CSP + standard security
  headers.
- Plain Node.js deployment (PM2/systemd — no Docker), GitHub Actions CI
  (lint, typecheck, test against a real Postgres, build, dependency audit).

## 2. Requirements

- Node.js 20.9+ and npm.
- PostgreSQL 14+, installed locally or reachable over the network — see
  `docs/DATABASE.md` §1 for setup (no Docker needed or used anywhere in this
  project).
- Redis (optional in dev — see `SECURITY.md` §9; recommended/required in
  production).

## 3. Installation

```bash
npm install
cp .env.example .env      # then fill in real values — see §4
```

## 4. Environment variables

See `.env.example` for the full annotated list and `docs/DEPLOYMENT.md` for
the production-specific table (which are required vs. optional, and why).
Summary: `DATABASE_URL` (Postgres), `AUTH_SECRET` (session signing —
required in production), `REDIS_URL` (rate limiting — recommended),
`NEXT_PUBLIC_APP_NAME` (cosmetic only).

## 5. Development

```bash
npm run db:migrate                    # create the schema (see §6 first if
                                       # Postgres isn't set up yet)
npm run db:seed                       # demo data — see the accounts table below
npm run dev                           # http://localhost:3000
```

## 6. PostgreSQL setup

Install PostgreSQL locally (no Docker) and create the role/database
`.env.example` expects — full walkthrough, including the pgAdmin GUI steps,
in `docs/DATABASE.md` §1. Already have a Postgres role/database you'd rather
use? Just point `DATABASE_URL` in `.env` at it instead.

## 7. Prisma setup

`prisma/schema.prisma` is the source of truth for the schema;
`src/lib/server/prisma.ts` is the shared client. `npm run db:generate`
regenerates the client after a schema change (also runs automatically via
`postinstall`). See `docs/DATABASE.md` for the full schema design rationale.

## 8. Migrations

```bash
npm run db:migrate           # development — creates + applies a new migration
npm run db:migrate:deploy    # production — applies existing migrations only
```

Never `prisma migrate reset` or `prisma db push` against real data — see
`docs/DATABASE.md` §5.

## 9. Testing

```bash
npm test              # unit tests (billing math, validation, auth, rate limiting)
                       # + DB integration tests, skipped automatically without
                       # RUN_DB_TESTS=1 and a live database — see below
npm run typecheck
npm run lint
```

To run the database integration tests locally (they run for real in CI
against a disposable Postgres — see `.github/workflows/ci.yml`):

```bash
npm run db:migrate
RUN_DB_TESTS=1 npm test
```

## 10. Deployment

No Docker — this app deploys as a plain Node.js process, run under a
process manager (PM2 or systemd). Full walkthrough — build/run commands,
process manager configs, TLS/reverse-proxy setup, environment variable
reference, CI/CD pipeline description, and rollback guidance:
`docs/DEPLOYMENT.md`.

## 11. Security

Full security architecture, what's implemented and why, and known
limitations stated plainly: `SECURITY.md`.

## 12. Backup

`pg_dump`-based backup/restore procedure, retention, RPO/RTO, and restore
testing: `docs/DISASTER-RECOVERY.md`.

## 13. Troubleshooting

See `docs/DEPLOYMENT.md`'s Troubleshooting section for common startup/deploy
issues (missing `AUTH_SECRET`, DB connectivity, rate-limiter Redis fallback).

## Demo accounts (sign in with User ID)
| User ID | Password | Role  |
|---------|----------|-------|
| admin   | admin123 | admin |
| rohit   | user123  | user  |

Only **admins** see User Management, Admin Oversight, and can change the
subscription plan (now enforced server-side, not just hidden in the UI —
see `docs/ARCHITECTURE-AUDIT.md` §2.1) — and only admins keep working once a
plan expires.

## Feature map

- **GST vs Non-GST billing.** Each document has a bill type. GST invoices show CGST/SGST
  (intra-state) or IGST (inter-state) plus an HSN/SAC tax summary, in indigo. Non-GST
  documents render as a green **Bill of Supply** with no tax columns/summary and a
  "no GST charged" note. Toggle per document in the editor; Invoices has dedicated
  "GST tax invoice" and "Non-GST bill" actions (prefixes INV / BOS).
- **Accurate calculations.** All money flows through `src/lib/billing.js` (`docTotals`):
  area rounded to 2dp before × rate, paise-accurate lines, pro-rata discount, per-HSN
  tax so the summary and grand total reconcile. Locked by `src/lib/billing.test.js`
  (30 tests, unchanged by this migration).
- **Responsive UI.** Desktop sidebar → mobile hamburger drawer; condensed topbar; grids
  collapse; wide tables and documents scroll horizontally.
- **Secure auth + user management.** Argon2id password hashing (with transparent
  upgrade from legacy bcrypt hashes), signed JWT (jose) in an httpOnly/SameSite
  cookie, `proxy.ts` guarding every route. `/api/users` is **admin-only**
  (server-checked) for creating/updating/deactivating accounts; the data API never
  returns password hashes.
- **Subscription-first access (mock billing).** Free Trial, Monthly, Quarterly, Six-Month,
  Yearly. "Subscription & Billing" is the first item in the nav and the screen every
  user lands on, since the product is sold on a subscription. **Admins always have free,
  unrestricted access** regardless of plan status. Everyone else is locked out of the
  rest of the workspace the moment the plan expires/is inactive — only Subscription &
  Billing stays open for them, with a clear banner and a locked nav, until an admin
  renews a plan (only admins can change the plan — enforced server-side). No real
  payment is taken.
- **Documents & Designs that actually open.** Uploaded files are validated server-side
  (size cap, MIME allowlist — see `SECURITY.md` §7) and stored in Postgres; "Open"/
  "Download" on a document shows the real file. 8MB/file cap.
- **Labour attendance.** Per-worker **check-in / check-out** times by date, plus a
  **monthly report** (days present, total hours, payable = days × daily rate) that prints.
- **Company logo & branding.** Upload/remove logo, edit company name/tagline in Settings
  (stored in Postgres); these — not a hardcoded brand — drive the sidebar, topbar
  breadcrumb, and every printed quotation/invoice, so the product is ready to resell to a
  different company without code changes. `NEXT_PUBLIC_APP_NAME` only controls the
  pre-login screen/browser title (before company data has loaded).

## Structure (high level)

```
src/app/            layout, login, protected page, api/ (auth, data, state, users, health, ready)
src/proxy.ts         auth/security guard for all routes (Next.js 16's renamed middleware)
src/lib/             format, billing (+test), catalog, status, plans, api — unchanged;
                     validation/ (Zod), server/ (Prisma, auth, rate-limit, logging)
src/services/        one file per entity — the only code that talks to Prisma
src/components/      Workspace (auth+state), Sidebar, Topbar, ui, views/*
prisma/              schema.prisma, migrations/, seed.ts
```

See `docs/ARCHITECTURE.md` for the full request-lifecycle diagram and
directory-by-directory explanation.
