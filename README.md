# Teakworks — Furniture Quote-to-Cash ERP/CRM (Next.js)

Full-stack **Next.js (App Router)** ERP/CRM for furniture & interior contractors:
GST and Non-GST billing, room-wise quoting, clients, projects, labour attendance with
monthly reports, documents, subscription management, secure auth with admin-managed
users, and a uploadable company logo.

## Requirements
Node.js 18.17+ and npm.

## Run
```bash
npm install
npm run dev        # http://localhost:3000
npm test           # billing test suite (30 tests)
npm run build && npm run start   # production
```

## Feature map
- **GST vs Non-GST billing.** Each document has a bill type. GST invoices show CGST/SGST
  (intra-state) or IGST (inter-state) plus an HSN/SAC tax summary, in indigo. Non-GST
  documents render as a green **Bill of Supply** with no tax columns/summary and a
  "no GST charged" note. Toggle per document in the editor; Invoices has dedicated
  "GST tax invoice" and "Non-GST bill" actions (prefixes INV / BOS).
- **Accurate calculations.** All money flows through `lib/billing.js` (`docTotals`):
  area rounded to 2dp before × rate, paise-accurate lines, pro-rata discount, per-HSN
  tax so the summary and grand total reconcile. Pricing-mode switching now seeds the
  right fields (fixes the blank sq.ft inputs). Locked by `lib/billing.test.js`.
- **Responsive UI.** Desktop sidebar → mobile hamburger drawer; condensed topbar; grids
  collapse; wide tables and documents scroll horizontally.
- **Secure auth + user management.** bcrypt-hashed passwords, signed JWT (jose) in an
  httpOnly/SameSite cookie, `middleware.js` guarding every route. `/api/users` is
  **admin-only** (server-checked) for creating/updating/deactivating accounts; the data
  API never returns password hashes.
- **Subscription-first access (mock billing).** Free Trial, Monthly, Quarterly, Six-Month,
  Yearly. "Subscription & Billing" is the first item in the nav and the screen every
  user lands on, since the product is sold on a subscription. **Admins always have free,
  unrestricted access** regardless of plan status. Everyone else is locked out of the
  rest of the workspace the moment the plan expires/is inactive — only Subscription &
  Billing stays open for them, with a clear banner and a locked nav, until an admin
  renews a plan (only admins can change the plan). No real payment is taken.
- **Documents & Designs that actually open.** Uploaded files are read and stored as data
  URLs (same approach as the company logo), so "Open"/"Download" on a document now shows
  the real file instead of just its name — fixed; previously only metadata was kept and
  nothing could be opened. 8MB/file cap for the in-memory demo store.
- **Labour attendance.** Per-worker **check-in / check-out** times by date, plus a
  **monthly report** (days present, total hours, payable = days × daily rate) that prints.
- **Company logo & branding.** Upload/remove logo, edit company name/tagline in Settings
  (stored as a data URL/text); these — not a hardcoded brand — drive the sidebar, topbar
  breadcrumb, and every printed quotation/invoice, so the product is ready to resell to a
  different company without code changes. `NEXT_PUBLIC_APP_NAME` only controls the
  pre-login screen/browser title (before company data has loaded).

## Demo accounts (sign in with User ID)
| User ID | Password | Role  |
|---------|----------|-------|
| admin   | admin123 | admin |
| rohit   | user123  | user  |

Only **admins** see User Management, Admin Oversight, and can change the subscription —
and only admins keep working once a plan expires.

## Structure (high level)
```
app/            layout, login, protected page, api/ (auth, data, state, users)
middleware.js   JWT guard for all routes
lib/            format, billing(+test), catalog, status, plans, api, server/{jwt,store,session}
components/     Workspace (auth+state), Sidebar, Topbar, ui, views/*
```

## Notes / next steps
- The server store is **in-memory** (`lib/server/store.js`) so it runs with zero setup but
  resets on restart. Swap it for Postgres/Prisma — the API surface stays the same; users,
  attendance and subscription are already modelled as first-class data.
- Subscription is a selector only; wire Razorpay/Stripe behind `/api` to take real payments.
- "Download PDF" uses browser print-to-PDF; add server-side PDF + WhatsApp/email behind the API for automation.
