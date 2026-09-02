# Security

This document describes the security architecture of the Teakworks Furniture
Billing System, what's implemented, why, and what isn't. **This application
is not, and no application is, "100% secure."** What follows is a description
of the controls in place, the reasoning behind them, and the risks that are
knowingly accepted rather than solved — so a reviewer can make an informed
call, not take anything on faith. See `docs/ARCHITECTURE-AUDIT.md` for the
problems found in the pre-existing app and why each decision below was made.

## 1. Security architecture

```
Browser (React SPA, httpOnly session cookie)
   │
   ▼
proxy.ts  ── security headers, rate limiting, CSRF check, auth gate
   │
   ▼
Route handlers (src/app/api/**)  ── Zod validation, RBAC
   │
   ▼
Service layer (src/services/**)  ── business logic, transactions
   │
   ▼
Prisma  ── parameterized queries, FK/unique constraints
   │
   ▼
PostgreSQL
```

Every request that reaches business logic has passed: rate limiting →
authentication → (where relevant) authorization → input validation, in that
order — see `proxy.ts` and `src/lib/server/session.ts`.

## 2. Authentication

- Session identity is a JWT (HS256, `jose`) in an `httpOnly`, `SameSite=Lax`
  cookie (`src/lib/server/jwt.ts`, `src/app/api/auth/login/route.ts`), signed
  with `AUTH_SECRET`. The cookie is `Secure` whenever `NODE_ENV=production`.
- **`AUTH_SECRET` is required in production.** The app throws (at the point a
  token is actually signed/verified, not at import time — see the comment in
  `src/lib/server/env.ts` for why) if it's missing in production, rather than
  silently falling back to the old hardcoded default. A dev-only fallback
  still exists purely so `npm run dev` works with zero setup.
- Sessions expire after 7 days (`setExpirationTime("7d")`); there's no
  refresh-token rotation — a deliberate scope call for this app's size (a
  handful of internal staff accounts), noted as a limitation in §19.
- **Login never reveals whether a userId exists.** `src/app/api/auth/login/route.ts`
  looks up the user, then *always* runs a password verification (against a
  real hash, or a fixed dummy Argon2id hash if the account doesn't exist or
  is inactive) before deciding — so a missing account and a wrong password
  return the same `401` in roughly the same time, avoiding user enumeration.
- **Rate limiting on `/api/auth/*`**: 10 requests/minute per IP (see §9). This
  is the app's brute-force defense — there's no separate account lockout, so
  a distributed attacker (many IPs) against one account isn't stopped by this
  alone; see §19.
- **Logout** clears the cookie server-side (`maxAge: 0`); there's no
  server-side token revocation list, so a stolen token remains valid until it
  expires naturally. Given the 7-day expiry and internal-tool threat model,
  this was judged an acceptable tradeoff over adding a session store — flagged
  in §19 as the thing to add first if that threat model changes.
- **Password reset / email verification**: not implemented. The app has no
  outbound email integration, and user accounts are admin-provisioned
  (`/api/users`, admin-only) rather than self-registered — so "never reveal
  whether an email exists during password reset" doesn't apply; there's no
  self-service reset flow to leak through. An admin resets a user's password
  directly via `/api/users`.

## 3. Authorization

- **Authentication ≠ authorization.** `src/lib/server/session.ts` exposes
  `requireUser()` (any authenticated user) and `requireAdmin()` (role must be
  `admin`, checked from the server-verified JWT payload — never from
  anything the client sends), and role is always taken from that trusted
  server-side session, not a client-supplied field.
- **RBAC**: two roles, `admin` and `user`. Enforced server-side:
  - `/api/users` (list/create/update/delete accounts) — admin-only.
  - `PUT /api/state/subscription` — admin-only (this was a real gap in the
    pre-existing app — see `docs/ARCHITECTURE-AUDIT.md` §2.1 — any
    authenticated user could change the plan via a direct API call even
    though the UI hid the control).
  - Every other business-data key (`clients`, `projects`, `quotes`,
    `invoices`, `workers`, `alloc`, `documents`, `attendance`, `log`,
    `company`) is writable by any authenticated user. This is not an
    oversight: this app models one shared company workspace for a small
    internal team, not a multi-tenant SaaS with per-user data ownership —
    that's the same coarse-grained model the UI already presented (Settings
    has no admin gate either), just now actually enforced server-side to
    match. There's no per-user object ownership anywhere in the data model to
    check against.
- **Object-level authorization / IDOR**: the app has no `/user/:id`-shaped
  routes where one authenticated user could reach another's private record by
  changing an id — the shared-workspace model above means "your data" and
  "the company's data" are the same set for every authenticated account. The
  one place this matters is `/api/users` (admin-only, already covered) and
  the self-delete guard (`src/services/users.service.ts`: an admin can't
  delete their own account, preventing accidental lockout — not a security
  boundary, a safety one).

## 4. Password security

- **Argon2id** (`src/lib/server/auth.ts`, the `argon2` package) for new
  password hashes — OWASP's current recommendation, memory-hard against
  GPU/ASIC cracking (`memoryCost: 19456` / ~19MB, `timeCost: 2`,
  `parallelism: 1`, OWASP's stated minimums).
- Existing/legacy bcrypt hashes (cost 10) still verify correctly — detected
  by their `$2a$`/`$2b$`/`$2y$` prefix — and are **transparently upgraded to
  Argon2id on the user's next successful login** (`needsRehash()` +
  re-hash-and-save in the login route). No forced reset, no downtime.
- `passwordHash` is never selected into any API response
  (`src/services/users.service.ts`'s `toPublic()` explicitly picks fields —
  it doesn't spread the Prisma row) and is excluded from `GET /api/data`
  (that endpoint never even queries the `users` table).
- Passwords, hashes, tokens, and cookies are never logged — see §14.

## 5. Session security

- httpOnly (JS can't read the cookie — mitigates token theft via XSS),
  `SameSite=Lax`, `Secure` in production, `path=/`, 7-day `maxAge`.
- No sensitive data lives in the JWT payload beyond `sub` (user id),
  `userId`, `name`, and `role` — nothing a client seeing the cookie's
  (base64, not encrypted) payload couldn't already know about their own
  account.

## 6. CSRF considerations

- The httpOnly `SameSite=Lax` cookie already stops the classic cross-site
  form/fetch CSRF case for this same-origin JSON API: `Lax` cookies aren't
  attached to cross-site `POST`/`PUT`/`DELETE` fetches or cross-site form
  submissions.
- **Defense in depth, per the brief's explicit instruction not to rely on
  `SameSite` alone**: `proxy.ts` additionally checks `Sec-Fetch-Site` (falling
  back to comparing the `Origin` header against `Host` on older browsers that
  don't send `Sec-Fetch-Site`) on every mutating request (`POST`/`PUT`/
  `PATCH`/`DELETE`) and rejects cross-site ones with `403` before they reach
  any route handler.
- `/api/auth/*` is exempt from this same-origin check for the same reason
  it's exempt from the auth gate — login itself has to be reachable.

## 7. XSS protection

- React escapes all rendered text by default; `dangerouslySetInnerHTML` is
  not used anywhere in this codebase (verified — grep for it if that ever
  changes and treat any hit as a review-required addition).
- **Content-Security-Policy** (`next.config.ts`) blocks loading any
  cross-origin script, restricts fonts/styles/images to `self` (plus Google
  Fonts, already used by the app) and `data:`/`blob:` for images, and sets
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`,
  `frame-ancestors 'none'`. See §10 for why it's a static (non-nonce) policy
  and still needs `'unsafe-inline'` on `script-src`/`style-src`.
- **Document uploads (`src/lib/validation/documents.ts`)**: files are stored
  and later reopened via `window.location.href = dataUrl`
  (`src/components/views/Documents.jsx`, unchanged). An uploaded file with
  MIME type `text/html` (or an SVG containing a `<script>`) would previously
  have been openable as if it were a page from this app — a stored-content
  risk. The server now validates every upload against a strict MIME
  **allowlist** (images, PDF, Office docs, CSV — no `text/html`,
  `image/svg+xml`, or any `*/javascript` type) before storing it, closing
  that path. Filenames are also stripped of any path component server-side.
- Data coming back from Postgres is **not** assumed safe just because it came
  from the database — it can contain attacker-supplied content (a client
  name, a quotation line-item description) originally entered by a user, and
  is rendered through React's normal escaping like anything else, never via
  `dangerouslySetInnerHTML`.

## 8. SQL injection protection

- All database access goes through Prisma's generated client
  (`src/lib/server/prisma.ts`), which parameterizes every query. There is
  **one** raw query in the codebase — `prisma.$queryRaw\`SELECT 1\`` in
  `/api/ready` — a fixed literal with no interpolated input, used only as a
  connectivity check.
- No string-built SQL, no `$queryRawUnsafe`, anywhere.

## 9. Rate limiting

- Backed by **Redis** (`src/lib/server/rate-limit.ts`), via a single atomic
  `INCR`+`PEXPIRE` Lua script (fixed-window counter) — chosen because it's
  correct across every app process/instance sharing one Redis, unlike an
  in-process counter, satisfying the brief's explicit requirement that rate
  limiting must work across more than one running instance. Point
  `REDIS_URL` at any reachable Redis (self-hosted or managed) in production
  — see `docs/DEPLOYMENT.md`.
- Limits (`proxy.ts`): `/api/auth/*` — 10 requests/minute/IP.
  `/api/*` generally — 120 requests/minute/IP.
- **Explicit, documented dev-only fallback**: if `REDIS_URL` is unset, the
  limiter falls back to an in-memory per-process counter so `npm run dev`
  works without standing up Redis. This fallback does **not** work correctly
  across multiple instances — the app logs a warning if it boots in
  production without `REDIS_URL` rather than silently degrading to it.
- If the Redis check itself fails (network blip), the limiter **fails open**
  (allows the request) rather than taking the whole app down over a rate
  limiter outage — a deliberate availability-over-strictness tradeoff, logged
  as an error either way.

## 10. Security headers

Set globally via `next.config.ts` `headers()`:

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | see below | restrict script/style/frame/object sources |
| `X-Content-Type-Options` | `nosniff` | stop MIME-sniffing away from a declared type |
| `X-Frame-Options` | `DENY` | clickjacking (belt-and-suspenders with `frame-ancestors`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | don't leak full URLs to third parties |
| `Permissions-Policy` | camera/microphone/geolocation off | no legitimate use in this app |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | force HTTPS once TLS is terminated in front of the app |

**CSP is a static policy, not the nonce-based one Next.js's own docs
recommend as strictest** — a deliberate, documented tradeoff (see the comment
in `next.config.ts`): a nonce-based CSP forces every page to render
dynamically (no static optimization) and has no mechanism to authorize React
inline `style={{...}}` attributes, which this app's progress bars
(`SubscriptionView`, `ProjectsView`) use — CSP has no nonce/hash story for the
`style` *attribute*, only for `<style>` elements. Without a browser available
in this environment to verify a stricter policy doesn't silently break
hydration or those progress bars, the static policy (matching Next's own
documented "without nonces" example, which also needs `'unsafe-inline'` on
`script-src` for its framework-injected hydration script) was chosen over an
unverified stricter one. Everything else in the policy is fully locked down.
**Follow-up**: remove the inline `style` usage and adopt the nonce-based CSP
once this can be verified in a real browser.

## 11. Secrets management

- `.env` is `.gitignore`d (it was previously committed with placeholder
  values — fixed, see `docs/ARCHITECTURE-AUDIT.md` §2.3) and `node_modules/`
  was also previously committed (8,904 files) — both untracked now.
- `.env.example` contains **only placeholders**, never real values.
- No secret is ever put behind `NEXT_PUBLIC_`. `NEXT_PUBLIC_APP_NAME` is the
  only public env var and it's non-sensitive (a display string).
- Real secrets are never committed or built into the app — they're set as
  actual environment variables on the host (or in the process manager's
  config — see `docs/DEPLOYMENT.md`) and read at runtime. `AUTH_SECRET` is
  required with no insecure default in production (§2); a missing/invalid
  `DATABASE_URL` fails loudly (a clear Prisma connection error, not a silent
  fallback) rather than the app limping along against nothing.
- Logs never contain passwords, hashes, tokens, cookies, or `DATABASE_URL`/
  `AUTH_SECRET` — see §14.

## 12. Database security

- **Constraints, not just application logic**: every FK is real (see
  `docs/DATABASE.md` for the full schema), `NOT NULL` where the business data
  requires it, `@unique` on `User.userId`/`User.email`/`Quote.number`/
  `Invoice.number`, and a real `Role`/`TaxMode`/`QuoteStatus`/`InvoiceStatus`
  enum instead of an unchecked string.
- **`onDelete: Restrict`** on `Project.clientId`, `Quote.clientId`, and
  `Invoice.clientId` — a client with existing projects, quotes, or invoices
  can no longer be deleted (previously: silently allowed, orphaning every
  reference to it — see `docs/ARCHITECTURE-AUDIT.md` §2.10). The API maps
  the resulting FK-violation into a clean `409`, not a raw DB error.
- **Transactions**: every multi-row write (the "replace this whole array"
  endpoints — `src/services/*.service.ts`) runs inside a single
  `prisma.$transaction`, so a partial failure can't leave, e.g., three of
  five clients deleted and two not.
- **Least privilege**: production deployment docs (`docs/DEPLOYMENT.md`)
  recommend a Postgres role scoped to just this app's schema, not a
  shared/admin superuser account — `DATABASE_URL` determines which role the
  app connects as, and nothing in the app requires superuser privileges.
- Postgres should never be exposed to the public internet — bind it to
  `localhost`/an internal network interface and reach it only from the app
  host, or from a private network if they're on separate machines. See §13.

## 13. Process / host security

This app runs as a plain Node.js process (no Docker — see
`docs/DEPLOYMENT.md`), so the isolation Docker would otherwise provide comes
from standard OS-level practices instead:

- **Non-root**: run the app as a dedicated, unprivileged OS user (the
  `docs/DEPLOYMENT.md` systemd example uses `User=teakworks`), never as
  `root`/Administrator. That user should own nothing outside its own
  application directory.
- **File permissions**: the file holding production secrets (an
  `EnvironmentFile`, or equivalent) should be readable only by that user
  (`chmod 600` on Linux).
- **Network exposure**: the app listens on `127.0.0.1`/an internal
  interface, not `0.0.0.0` on a publicly routable one — a reverse proxy is
  the only thing that should be internet-facing (`docs/DEPLOYMENT.md`).
  Postgres and Redis likewise bind to `localhost` or a private network
  interface, never a public one.
- **Process supervision**: PM2 or systemd (`docs/DEPLOYMENT.md`) restarts
  the app if it crashes and forwards `SIGTERM`/`SIGINT` correctly, which
  `src/instrumentation.ts` uses for a clean shutdown (closing DB
  connections) rather than an abrupt kill.
- **Firewall**: only the reverse proxy's port (443, and 80 for redirect)
  should be reachable from outside the host; the app's own port and
  Postgres/Redis's ports should be blocked at the OS firewall from anything
  but localhost/the private network, as a second layer behind "don't bind
  to a public interface" above.
- No secret is ever committed to the repository or baked into a build
  artifact — see §11.

## 14. Logging

- Structured JSON logging via `pino` (`src/lib/server/logger.ts`), with a
  `redact` list covering `password`, `passwordHash`, `token`, `cookie`,
  `req.headers.authorization`, `req.headers.cookie`, `DATABASE_URL`, and
  `AUTH_SECRET` at any nesting depth those keys appear.
- Logged: failed login attempts (`src/app/api/auth/login/route.ts`), 5xx
  errors with their real cause (`src/lib/server/http.ts`'s
  `toErrorResponse`), readiness-check DB failures, and rate-limiter/Redis
  errors.
- **Not** logged: every successful request (would be high-volume, low-value
  noise for an app this size — see the brief's own "don't log every request
  blindly" guidance) and, per the redaction list, nothing that reveals a
  credential even if a stack trace happens to reference one.

## 15. Monitoring

- `GET /api/health` — liveness only (process is up), no dependency checks.
- `GET /api/ready` — readiness: actually runs `SELECT 1` against Postgres and
  returns `503` if the database is unreachable. Used as the process
  manager/load balancer's healthcheck target — poll this one before routing
  traffic to an instance, not `/api/health`.
- Neither endpoint returns environment variables, stack traces, or any
  infrastructure detail beyond `{ status, database }`.
- No APM/metrics exporter is wired up (no Sentry/Datadog/etc.) — this app
  currently has no such account to point at; `pino`'s structured JSON output
  is ready to ship to any log aggregator that accepts it. Flagged as a
  production follow-up in §19.

## 16. Backup strategy

See `docs/DISASTER-RECOVERY.md` for the full runbook. Summary: **the
Postgres data directory itself is not a backup** — `pg_dump` on a schedule,
shipped off the host and retained/tested independently. That document
covers RPO/RTO, retention, and restore-testing.

## 17. Incident response

If credentials are suspected compromised:

1. Rotate `AUTH_SECRET` immediately — this invalidates every existing session
   token instantly (all JWTs signed with the old secret fail verification),
   forcing a re-login. There is no way to invalidate a single session without
   this (see §19).
2. Rotate `DATABASE_URL`'s password and `REDIS_PASSWORD` at the source
   (Postgres/Redis), then update the deployment's environment and restart.
3. Force-expire the affected user's account via `/api/users` (set `active:
   false`) if a specific account, not the whole secret, is the concern.
4. Check `pino` logs for the failed-login and 5xx entries around the
   suspected window (§14) — these are the only structured security-event
   trail currently emitted; there's no dedicated SIEM integration (§19).

## 18. Dependency updates

- `npm audit` is run in CI (`.github/workflows/ci.yml`) on every push/PR,
  `--audit-level=high`, non-blocking (`continue-on-error`) — see that
  workflow's comment for why: audit's exit code can't distinguish a newly
  introduced vulnerability from one already triaged below, so a human reads
  the job output rather than the pipeline silently blocking on it forever.
- **Currently accepted, known vulnerabilities** (`npm audit`, all **high**
  severity, **none critical**): `deepmerge-ts` (via `@prisma/config`, a
  dependency of the `prisma` **CLI package**, not `@prisma/client`) has a
  stack-exhaustion advisory (GHSA-ggr8-5vv4-36mx) unfixed as of Prisma
  6.19.3, the latest release on the mature v6 architecture (see
  `docs/ARCHITECTURE-AUDIT.md` §4.3 for why v7 — which does fix it, via an
  unrelated rewrite of the config system — wasn't adopted instead). This is
  **not reachable from the running application**: `@prisma/config` is only a
  dependency of the `prisma` CLI (`migrate`/`generate`/`studio`), which the
  running server process never imports — the CLI is invoked only as an
  explicit, one-off deploy-time command (`prisma migrate deploy`, see
  `docs/DEPLOYMENT.md`), fed only this repo's own schema/migration files,
  never attacker-controlled input. Tracked for resolution when upgrading to
  Prisma 7+.
- Everything else audit found (a critical Vitest RCE, several Vite/esbuild
  issues, an eslint ReDoS, a PostCSS XSS/path-traversal chain) was fixed by
  bumping to patched versions within the same major line — `vitest` 2.1.8 →
  3.2.7 (small major bump, verified: all 30 pre-existing + 57 new tests still
  pass), `eslint` 9.18.0 → 9.39.5, `postcss` 8.4.49 → 8.5.26, `tsx` 4.19.2 →
  4.23.13.
- Dependency versions are exact-pinned in `package.json` (no `^`/`~`), with
  `package-lock.json` committed — upgrades are a deliberate, reviewed action,
  not something that drifts on every `npm install`.

## 19. Known limitations

Stated plainly, not hidden:

- **No single-session revocation.** Logout clears the client's cookie but
  the JWT itself remains valid until it expires (7 days) if captured before
  logout. Rotating `AUTH_SECRET` invalidates *every* session at once (§17)
  but there's no way to invalidate just one. Adding a server-side session
  store (or a JWT ID blocklist) is the natural next step if this app's threat
  model changes from "trusted small internal team" to something with a
  higher-value session-hijack incentive.
- **No brute-force lockout per account**, only per-IP rate limiting (§9) — a
  distributed attacker spreading a credential-stuffing attempt across many
  IPs isn't meaningfully slowed by this alone.
- **CSP still needs `'unsafe-inline'`** for scripts and styles — see §10 for
  the full reasoning and the follow-up.
- **The `documents.rooms`/quote-invoice line-item JSON columns are not
  independently queryable/indexable** the way normalized tables would be —
  a deliberate scope call (`docs/ARCHITECTURE-AUDIT.md` §4.4), not a security
  issue, but worth knowing if reporting/analytics on individual line items is
  ever needed.
- **No WAF / DDoS-layer protection** — this app's own rate limiting protects
  against application-level abuse, not a volumetric network attack; that's
  the responsibility of whatever sits in front of it in production (a CDN,
  cloud load balancer, or reverse proxy — see `docs/DEPLOYMENT.md`).
- **No automated dependency-update bot** (e.g. Dependabot/Renovate) is
  configured — updates are currently manual, gated by the exact-pinning
  policy in §18.
- **No SIEM/centralized security-event alerting** — `pino` logs structured
  events (§14) but nothing currently watches them for, e.g., a burst of
  failed logins and pages someone. Recommended before this app handles data
  more sensitive than it does today.
