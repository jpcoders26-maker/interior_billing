# Architecture Audit — Teakworks Furniture Billing System

Performed before any production-hardening changes were made. This document is the
Phase 1 deliverable: current-state inspection, problems found, and the decisions
that shaped the rest of the work. See `docs/ARCHITECTURE.md` for the resulting
design and `SECURITY.md` for the security posture after remediation.

## 1. What this app is

A single-tenant (one company, shared workspace) Next.js 14 App Router ERP for a
furniture/interior contracting business: GST + Non-GST quoting and invoicing with
room/item line breakdowns, clients, projects, labour attendance, documents, a mock
subscription gate, and admin-managed users.

- **Rendering**: one `"use client"` root (`components/Workspace.jsx`) that fetches
  the entire dataset once (`GET /api/data`) and holds it in React state.
- **Persistence contract**: the client treats each top-level slice of data
  (`company`, `clients`, `projects`, `quotes`, `invoices`, `workers`, `alloc`,
  `documents`, `attendance`, `log`, `subscription`) as an independently-persisted
  blob. Any local mutation is auto-saved 500ms later via
  `PUT /api/state/[key]` with the **entire new array/object** for that key
  (`components/Workspace.jsx:76-87`, `lib/server/store.js:106`). There is no
  per-record CRUD API — the granularity is "whole slice, replace all."
- **Auth**: bcrypt-hashed passwords, a `jose`-signed JWT in an httpOnly cookie,
  verified in `middleware.js` on every request. `role` is `"admin" | "user"`,
  carried in the JWT payload.
- **Storage**: `lib/server/store.js` — a plain JS object seeded on boot and held
  in `globalThis` for the life of the Node process. No database. Everything is
  lost on restart/redeploy.
- **Billing math**: `lib/billing.js` (`docTotals`) is pure and stateless — it
  consumes a `{ rooms: [{ items: [...] }] }` tree with per-item `mode`
  (`sqft | qty | direct`) and returns rounded, reconciling totals (CGST/SGST vs
  IGST, per-HSN summary, pro-rata discount). This module was not changed.

## 2. Confirmed security & correctness problems

1. **Subscription plan is writable by any authenticated user, not just admins.**
   `Subscription.jsx` disables the "Choose plan" button in the UI for non-admins
   (`disabled={!isAdmin}`), and the README states "only admins can change the
   plan" — but `PUT /api/state/subscription` (`app/api/state/[key]/route.js`)
   only checks `currentUser()`, not `role`. Any logged-in "user" account could
   call the endpoint directly (devtools/curl) and grant itself an unrestricted
   plan, since **admins bypass the subscription gate entirely**
   (`components/Workspace.jsx:134-136`, `lib/plans.js`). This is a real
   privilege-escalation path. **Fixed**: `subscription` writes are now
   server-side admin-gated.
2. **Zero input validation on any endpoint.** `PUT /api/state/[key]` accepts any
   JSON as the new value for a key and stores it verbatim
   (`app/api/state/[key]/route.js:16`). A malformed or malicious payload
   (wrong shape, huge arrays, prototype-pollution-shaped keys, etc.) is accepted
   without complaint. `POST /api/users` only checks `userId`/`name` presence.
   **Fixed**: every write now goes through a Zod schema.
3. **`.env` is committed to git** (placeholder values today, but the file and
   the habit are wrong) and **`.gitignore` was corrupted** — saved as UTF-16LE
   with a single entry (`node_modules/`), so it never actually ignored `.env`,
   build output, or anything else. **Fixed**: rewritten as UTF-8, `.env`
   untracked.
4. **No rate limiting anywhere**, including `/api/auth/login`. Password brute
   forcing is unthrottled. **Fixed**: Redis-backed limiter (documented in
   `SECURITY.md` §9) on `/api/auth/*` and general `/api/*`.
5. **No security headers.** No CSP, HSTS, X-Content-Type-Options,
   Referrer-Policy, Permissions-Policy, or X-Frame-Options were set anywhere.
   **Fixed**: `next.config.ts` + a per-request CSP nonce set in `proxy.ts`.
6. **Document uploads are unrestricted and unsafely opened.**
   `components/views/Documents.jsx` accepts any file type up to 8MB, stores it
   client-read as a data URL, and later opens it with
   `win.location.href = d.dataUrl` — a file with `type: "text/html"` becomes a
   same-tab-navigable HTML document with no sanitization. The server never
   validated size/MIME server-side either (the array was just persisted
   verbatim, problem #2). **Fixed**: server-side size cap + MIME/extension
   allowlist, dangerous types (html/svg/scripts) rejected; documented residual
   risk in `SECURITY.md` §7 since the client-side "open" behavior is preserved
   for functional parity and now only ever sees allowlisted MIME types.
7. **JWT secret has an insecure default.** `lib/server/jwt.js` falls back to a
   hardcoded string if `AUTH_SECRET` is unset, so a misconfigured deployment
   silently runs with a known signing key. **Fixed**: the app now fails fast at
   boot in production if `AUTH_SECRET` is missing or short.
8. **Password hashing uses bcrypt at the default cost (10).** Acceptable but
   dated. **Upgraded**: Argon2id for new/rotated passwords, with transparent
   verify-and-upgrade for existing bcrypt hashes (see `SECURITY.md` §4).
9. **No CSRF defense beyond the implicit `SameSite=Lax` cookie.** Fine as a
   baseline for a same-origin fetch-only SPA, but Phase 15 asks for defense in
   depth. **Fixed**: `proxy.ts` also validates `Origin`/`Sec-Fetch-Site` on
   mutating requests.
10. **No object-level delete protection.** `ClientsView` lets any authenticated
    user delete a client that has projects/quotes/invoices referencing it
    (`components/views/Clients.jsx:16`), silently orphaning `clientId`
    references (`lib/billing.js`'s `clientById()` lookups then return
    `undefined`). There was no FK to enforce this because there was no
    database. **Fixed**: real foreign keys with `onDelete: Restrict` on
    `Project.clientId`, `Quote.clientId`, `Invoice.clientId`; the API now
    returns a clean `409` instead of a silent DB-level failure or, previously,
    silent corruption.
11. **In-memory store**: all data (including uploaded files) is lost on every
    restart/redeploy/crash, and cannot be shared across multiple app instances
    — a hard blocker for any real multi-instance or persistent deployment.
    **Fixed**: PostgreSQL via Prisma (§3 below).
12. **No tests beyond `lib/billing.test.js`** (30 pure-function tests, kept
    as-is — still the source of truth for the money math and untouched).
13. **No Docker, no CI, no health checks, no structured logging, no error
    boundaries** (`app/error.tsx`, `not-found.tsx`, `global-error.tsx` didn't
    exist — an unhandled exception anywhere in the tree produced Next.js's
    default framework error UI, which in production can leak stack details
    depending on config).

## 3. Orphaned code found and removed

`src/` (`src/pages/**`, `src/lib/prisma.ts`, `src/lib/auth.ts`,
`src/components/Layout.tsx`) was a **second, disconnected** Pages Router
scaffold with its own Prisma schema and auth helpers, committed in `c0a8bee`.
It:

- was never reachable — this app's real routes live in `app/` (App Router) at
  the repo root, not `src/app/`, and Next.js does not treat `src/pages` as the
  pages directory unless `app/` is *also* under `src/`;
- depended on `typescript`, `prisma`, `@prisma/client` — none of which were (or
  are) in `package.json`, confirmed via `git log -p -- package.json`;
- modeled a *different* business domain (a generic `Lead`/`Customer` CRM) that
  doesn't match this app's actual entities (`Client`, room/item quotes,
  attendance, etc.).

It was dead weight that would have made "add Prisma" ambiguous (two
schemas, two auth systems). It's been deleted; the real Prisma/TypeScript
layer below lives inside the app that's actually served.

## 4. Key architectural decisions for the production migration

These are the calls a careful reviewer would ask about — recorded here so
they're not accidentally "fixed" later by someone assuming they were oversights.

### 4.1 Next.js 14 → 16, not a smaller/no-op bump

Checked `14.2.35` against the framework's own advisories: it already contains
the fix for the March 2025 middleware-authorization-bypass CVE
(fixed in 14.2.25; this app's auth model leans entirely on middleware, so this
mattered). No unpatched critical CVE forced an upgrade on its own. The upgrade
was still done because Phase 2 asks for "current stable," current stable is
16.x, and the diff surface for *this* app is small and precisely known (fetched
directly from `nextjs.org`'s own v15 and v16 upgrade guides rather than relying
on training data, given how much version drift there's been):
`middleware.js` → `proxy.js`/`proxy()` rename, `cookies()` → `await cookies()`
in `lib/server/session.js`, and `params` becoming a `Promise` in
`app/api/state/[key]/route.js`. React bumped to 19.2 as a forced peer of
Next 16. Verified with `next build`/`vitest` after the change (see
`docs/DEPLOYMENT.md` for what could and couldn't be verified in this sandbox —
no Docker/Postgres daemon was available here, see §5).

### 4.2 TypeScript pinned to 5.9.x, not the "latest" 7.0

`npm view typescript` resolves `latest` to `7.0.2` — the new Go-native
compiler, which GA'd only weeks before this migration. Its own release notes
state it **ships without a stable programmatic API**, and that
`typescript-eslint` and framework tooling can't consume it yet. Since this
migration needs typed ESLint (Phase 21/28) and Next's own stated minimum for
v16 is only `TypeScript 5.1+`, pinning to the mature `5.9.3` line is the
lower-risk, fully-tooling-compatible choice. Revisit once 7.1's programmatic
API lands and the ecosystem catches up.

### 4.3 Prisma pinned to 6.19.x, not "latest" (which is an 8.0 release candidate)

`npm view prisma dist-tags` shows `latest: 8.0.0-rc.12` — a release candidate,
which Phase 29/39 explicitly say never to ship. The last stable major, 7.x
(`@prisma/client@7.10.0`), is real but very new and rearchitects the client
(mandatory driver adapters, a new `prisma.config.ts`, ESM-only output, no more
`url` in the schema's `datasource` block) — a bigger, less-proven-in-the-wild
surface to get right in an unsupervised migration than the well-established
6.x line. `6.19.3` is used instead, on the classic (still fully supported)
architecture. Documented here as a deliberate, revisit-later choice, not an
oversight.

### 4.4 Business data model: relational tables for flat entities, validated JSONB for the nested quote/invoice line-item tree

`User`, `Subscription` (singleton), `Company` (singleton), `Client`, `Project`,
`Worker`, `WorkerAllocation`, `Attendance`, `Document`, `ActivityLog` became
real Prisma models with primary keys, foreign keys, unique constraints, and
indexes matched to the app's actual query patterns.

`Quote` and `Invoice` got real header columns (id, unique `number`, FKs to
`Client`/`Project`, `taxMode`, `status`, `gstRate`, `discount`, dates) but their
nested `rooms: [{ items: [...] }]` tree stays a single `Json` column,
Zod-validated (discriminated on `mode: sqft | qty | direct`) before every
write. This was **not** the default/lazy choice — it's because the seed data
itself proves room/item `id`s are only unique *within a document*
(`lib/server/store.js:39-53`, e.g. `room.id: 1` appears in `Q1`, `Q2`, and `I1`
independently), so a fully-normalized `Room`/`Item` table would need to invent
an ID-reconciliation scheme the app has never had — exactly the kind of
"invented business requirement" the brief says to avoid. `lib/billing.js` and
`DocEditor.jsx` already treat the tree as opaque, nothing anywhere queries a
single line item across documents, and full normalization can still be done
later without touching the header schema. Documented in
`docs/DATABASE.md` §3.

### 4.5 UI components stay JavaScript; the server/data layer is TypeScript

Full `strict: true` TypeScript conversion of all 15 `components/views/*.jsx`
files (~2,500 lines of presentational React, none of it security- or
data-integrity-relevant) was judged higher-risk-than-reward for this pass:
there's no browser in this environment to catch a bad prop-typing pass live,
and the brief explicitly says not to rewrite working business logic without
being able to verify it. `tsconfig.json` sets `strict: true` with
`allowJs: true`, `checkJs: false` — new/touched server code (API routes,
`lib/server/*`, validation, Prisma) is `.ts`, and the existing views keep
working unchanged, type-checked loosely by `next build`'s JS interop, not
strictly. Flagged as a tracked follow-up in `docs/ARCHITECTURE.md`, not
silently dropped.

## 5. What could not be verified in this environment

This sandbox has Node 20.10 and npm, but **no Docker daemon** and **no running
PostgreSQL**. That means:

- `prisma validate`, `prisma generate`, `next build`, `vitest`, and `npm audit`
  were run for real and their output is what's reported.
- `docker build`, `docker compose up`, an actual `prisma migrate dev` against a
  live database, the login flow end-to-end, and browser-rendered hydration
  checks were **not** runnable here and need to be exercised once this reaches
  a machine with Docker — see `docs/DEPLOYMENT.md` for the exact commands and
  what to look for.
