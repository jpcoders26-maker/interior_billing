# Architecture

The pre-migration state, the problems found, and the reasoning behind every
non-obvious decision below live in `docs/ARCHITECTURE-AUDIT.md` — this
document describes the result.

## System overview

```
Browser (React 19 SPA, single "use client" root: components/Workspace.jsx)
   │  fetch()
   ▼
proxy.ts (Next.js 16's renamed middleware)
   │  security headers · rate limiting · CSRF check · auth gate
   ▼
Route handlers — src/app/api/**/route.ts
   │  Zod validation · RBAC (requireUser/requireAdmin)
   ▼
Service layer — src/services/*.service.ts
   │  business logic · transactions · client-shape ⇄ DB-shape mapping
   ▼
Prisma Client — src/lib/server/prisma.ts
   ▼
PostgreSQL
```

## Directory layout

```
src/
  app/                    Next.js App Router — pages + API routes
    api/
      auth/{login,logout,me}/route.ts
      data/route.ts        GET — the whole workspace state (one aggregate read)
      state/[key]/route.ts PUT — replace one state slice (validated, RBAC'd)
      users/route.ts       admin-only user management
      health/route.ts      liveness
      ready/route.ts       readiness (checks Postgres)
    error.tsx, not-found.tsx, global-error.tsx
  components/             UI — unchanged from before this migration (see below)
  lib/
    format.js, billing.js, catalog.js, plans.js, status.js, api.js
                          unchanged pure helpers, shared client+server
    validation/*.ts       Zod schemas — one per entity, the actual input
                          boundary every write goes through
    server/
      prisma.ts           Prisma Client singleton
      auth.ts             Argon2id hashing + legacy-bcrypt verify/upgrade
      jwt.ts, session.ts  session tokens + requireUser/requireAdmin
      rate-limit.ts       Redis-backed limiter
      logger.ts           pino, with credential redaction
      http.ts             shared error → safe JSON response mapping
      env.ts               process.env validation (lazy — see its header comment)
      enum-map.ts, serialize.ts   client-shape ⇄ Postgres-shape conversions
  services/*.service.ts   one per entity — the only code that talks to Prisma
  proxy.ts                 renamed from middleware.js (Next.js 16 convention)
  instrumentation.ts       graceful-shutdown hook (SIGTERM/SIGINT → Prisma disconnect)
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/                    new: validation, auth, rate-limit (unit) + DB integration
```

## The "whole-slice state" API contract — kept, not replaced

`GET /api/data` returns the entire workspace in one response; `PUT
/api/state/[key]` replaces one named slice (`clients`, `projects`, `quotes`,
...) with a brand-new array/object every time a local edit happens
(`components/Workspace.jsx`'s `usePersisted` hook, debounced 500ms). This
predates the database — it's the existing app's entire data-loading and
persistence model across all 15 view components.

This migration kept that contract exactly, and moved what's behind it from
an in-memory JS object to durable Postgres with real transactions,
constraints, and validation. The alternative — redesigning the API surface
into granular per-record REST endpoints — would have meant rewriting the
data-fetching and mutation logic in every one of those 15 components, with
no browser available in the environment this migration was done in to verify
the result didn't regress something. `src/services/*.service.ts`'s
`replaceX()` functions implement "whole-array replace" as an atomic
transaction (delete rows missing from the incoming array, upsert everything
present) — so the *contract* is unchanged, but every write is now validated,
constrained, and durable in a way it never was before.

## What changed vs. what stayed the same

**Stayed the same** (see `docs/ARCHITECTURE-AUDIT.md` §4.5): all 15 files in
`src/components/**` — business logic, UI, and the client-side data flow are
untouched. `src/lib/billing.js` (the money math) and its 30-test suite are
untouched. Login UX, the subscription paywall behavior, room/item quote
editing — all identical from the user's perspective.

**Changed**: everything behind the API boundary. In-memory store → Postgres.
Zero validation → Zod on every write. No rate limiting → Redis-backed.
Any-authenticated-user-can-change-the-subscription → admin-only (a real bug
fix, not a new restriction — see `docs/ARCHITECTURE-AUDIT.md` §2.1). bcrypt →
Argon2id with transparent upgrade. No security headers → CSP + the standard
set. Next.js 14 → 16, React 18 → 19.2. JavaScript API routes → TypeScript
with `strict: true`.

## Follow-ups (deliberately out of scope for this pass)

Recorded here so they're a choice, not a gap someone finds by accident:

1. **Full TypeScript conversion of `src/components/**`** — currently stays
   `.jsx`, type-checked loosely via `allowJs`/`checkJs: false`. See
   `docs/ARCHITECTURE-AUDIT.md` §4.5.
2. **Nonce-based CSP**, removing the current `'unsafe-inline'` — needs a
   browser to verify first (`SECURITY.md` §10).
3. **Normalized `Room`/`Item` tables** instead of the `Json` column on
   `Quote`/`Invoice` — needs an ID-reconciliation design first
   (`docs/ARCHITECTURE-AUDIT.md` §4.4).
4. **Object storage for document uploads** instead of Postgres `bytea` —
   would also need a frontend upload-flow change (`docs/DATABASE.md` §4).
5. **Per-session revocation** (a session store or JWT-id blocklist) instead
   of only whole-secret rotation (`SECURITY.md` §19).
6. **Prisma 7+**, once its driver-adapter/config rewrite has more real-world
   mileage (`docs/ARCHITECTURE-AUDIT.md` §4.3) — also resolves the one
   currently-accepted `deepmerge-ts` advisory (`SECURITY.md` §18).
