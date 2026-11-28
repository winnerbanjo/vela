# Vela API

Fastify 5 + TypeScript backend for the shipped Vela dashboard
(`node server.js` → http://localhost:3030/dashboard). This is the Day 1
foundation described in [PLAN.md](../docs/backend/PLAN.md); the binding design
lives in [ARCHITECTURE.md](../docs/backend/ARCHITECTURE.md) and
[SECURITY.md](../docs/backend/SECURITY.md), and the frontend contract is
[DASHBOARD_CONTRACT.md](../docs/backend/DASHBOARD_CONTRACT.md).

Status: Day 5 — quotes with versioned public acceptance, sequential deposit and
balance invoices, and jobs with intake and a client portal, on top of Day 2
identity/catalogue, Day 3 scheduling, and Day 4 payments (signed webhook,
append-only ledger, both settlement paths). `client/` is a separate React SPA
kept temporarily; it is not at 3030 and is no longer the contract of record.

## Requirements

- Node.js 22.9+ (`.nvmrc`; the local machine's Node 24 also works)
- Docker (for PostgreSQL 16)

## Run it

```bash
cp .env.example .env
openssl rand -base64 48        # paste the output into JWT_SECRET
npm ci
docker compose up -d           # Postgres on localhost:5435
npm run db:migrate             # applies prisma/migrations
npm run dev                    # http://localhost:5050
```

Verify:

```bash
curl -s localhost:5050/health/live    # {"status":"ok",...}
curl -s localhost:5050/health/ready   # database check
```

The API refuses to start when `JWT_SECRET`, `DATABASE_URL`, or `CORS_ORIGINS` are
missing or weak, and prints the field names only — never the values. That is a
feature, not a misconfiguration.

## Scripts

| Script                                           | What it does                                                  |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `npm run dev`                                    | API with watch reload                                         |
| `npm run dev:worker`                             | Worker entrypoint with watch reload                           |
| `npm run build`                                  | Compile to `dist/`                                            |
| `npm start` / `npm run start:worker`             | Run the compiled entrypoints                                  |
| `npm run typecheck`                              | `tsc --noEmit` over src and tests                             |
| `npm run lint` / `npm run format`                | ESLint 9 flat config / Prettier                               |
| `npm test`                                       | Unit + integration (integration skips without `DATABASE_URL`) |
| `npm run test:unit` / `npm run test:integration` | One suite at a time                                           |
| `npm run db:migrate`                             | `prisma migrate deploy` (forward-only)                        |
| `npm run db:status`                              | Applied vs pending migrations                                 |

## Layout

```text
src/
  apps/api/        Fastify bootstrap, health routes
  apps/worker/     Worker entrypoint (queue consumers arrive Day 3)
  modules/identity/  password hashing, OTP, sessions, auth routes
  modules/merchant/  profile, publish, custom domain
  modules/catalogue/ services and portfolio
  modules/schedule/  availability engine (pure), rules/overrides, holds, bookings
  modules/payments/  Paystack adapter (live/sandbox/disabled), payments, webhook, ledger
  modules/quotes/    opportunities, immutable quote versions, public acceptance
  modules/invoices/  numbered invoices, deposit/balance, public payment links
  modules/jobs/      jobs, intake templates/submissions, client portal, delivery
  modules/staff/     invites, roles, removal
  platform/        config, logger, errors, db (withTenant), auth guards, audit, cors
  shared/          money (integer kobo), slug
  types/           Fastify type augmentation
prisma/
  schema.prisma    merchants, users, sessions, otp_codes, audit_logs, catalogue,
                   availability rules/overrides, holds, bookings, allocations
  migrations/      Hand-written SQL including constraints Prisma cannot express
test/
  unit/            Pure logic and security contracts
  integration/     Real Postgres: health, tenant scoping, append-only audit
```

## Day 2 — identity, merchant, catalogue

Mounted under `/api`:

| Area      | Routes                                                                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth      | `POST /auth/register`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/accept-invite`, `GET /auth/me` |
| Merchant  | `GET/PATCH /merchant`, `POST /merchant/publish`, `POST/DELETE /merchant/domain`, `POST /merchant/domain/verify` (501)                                                                                 |
| Services  | `GET/POST /services`, `PATCH/DELETE /services/:id`, `POST /services/:id/archive`, `/restore`                                                                                                          |
| Portfolio | `GET/POST /portfolio`, `PATCH/DELETE /portfolio/:id`                                                                                                                                                  |
| Staff     | `GET/POST /staff`, `PATCH/DELETE /staff/:id`                                                                                                                                                          |

Behaviour worth knowing:

- Passwords are argon2id (64 MiB, t=3); OTPs are peppered HMAC digests, single-use,
  10 min TTL, 5 attempts, 3 per email per hour.
- The session cookie is opaque and hashed at rest, rotated on every refresh; a
  replayed rotated token revokes the whole family. Bearer JWTs (15 min) are for
  tooling and tests.
- Login locks for 15 minutes after 5 failures per email per IP; unknown emails
  still pay the argon2 cost so timing does not reveal accounts.
- Every write carries the session's merchant id. A foreign id returns `404`.
- Merchants, service, role and domain mutations write `audit_logs`.
- Money is integer kobo in requests and responses (`priceKobo`, `depositKobo`).

## Day 3 — scheduling, holds, bookings

All under `/api`:

| Area       | Routes                                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Hours      | `GET/PUT /availability/rules`, `GET/POST /availability/overrides`, `DELETE /availability/overrides/:id`                           |
| Public     | `GET /availability/slots?slug=&serviceId=&date=`, `POST /holds`, `DELETE /holds/:id`, `POST /bookings`                            |
| Front desk | `GET /bookings`, `POST /bookings/walk-in`, `POST /bookings/:id/cancel`, `POST /bookings/:id/reschedule`, `GET /availability/next` |

Behaviour worth knowing:

- Opening hours are minutes from local midnight in the merchant's timezone;
  conversion uses `Intl`, so a DST zone is handled without a date library.
  Overrides replace the weekly window for one date (closed or different hours).
- A slot is only returned when `start + duration` fits before closing. The
  buffer is cleanup time after the client leaves: it blocks the next booking but
  may run past closing.
- **The client never supplies an end time or a price.** Both are derived from the
  service, and the schemas are `.strict()`, so extra fields are a 400.
- `POST /holds` reserves the slot for `holdTtlMinutes` (default 15) by writing a
  `resource_allocations` row. `resource_allocations_no_overlap` (GiST + `tstzrange`)
  is the arbiter: 50 simultaneous holds on one slot produce one 201 and 49 409s.
- Expiry is lazy + swept: every slot read and hold attempt expires stale rows,
  and an unref'd 30 s timer is the backstop. A converted hold moves its
  allocation from `hold` to `booking` in the same transaction.
- Booking status moves only `confirmed → cancelled | completed | no_show`;
  anything else is a 409. Cancelling frees the allocation immediately.
- Confirming a hold snapshots `priceKobo` and `depositKobo` from the service, so
  a later price change does not rewrite an existing booking.
- Public booking routes are rate limited by `RATE_LIMIT_PUBLIC_MAX` (default 60
  per minute per IP) in addition to the global limit.

## Day 4 — payments

| Area    | Routes                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Public  | `POST /payments/initialize` (from a live hold)                                                                                       |
| Staff   | `GET /payments`, `GET /payments/:reference`, `GET /payments/ledger/entries`, `GET /payments/settings`, `GET /payments/banks`         |
| Owner   | `POST /payments/:id/refund`, `PUT`/`DELETE /payments/settings`, `POST`/`DELETE /payments/payout-account` (all with password step-up) |
| Webhook | `POST /webhooks/paystack` (raw body, `x-paystack-signature`, platform or merchant key, deduped by provider event id)                 |

Behaviour worth knowing:

- **Modes.** `PAYSTACK_SECRET_KEY` set → `live`. No key outside production →
  `sandbox`, which returns deterministic checkout/refund fixtures without a
  network call, so the whole flow is testable. No key in production →
  `disabled`: platform money routes return `501` instead of pretending to charge.
- **Settlement.** A merchant either settles through the platform's Paystack
  account (a verified subaccount receives the split) or connects their own
  Paystack secret key, in which case checkout and refunds use that key and money
  never touches Vela. `payments.settlement_mode` is pinned when the payment is
  initialized, so refunds always use the credential that took the charge.
- **Credentials.** Merchant secret keys and full payout account numbers are
  AES-256-GCM ciphertext. `PAYMENT_ENCRYPTION_KEY` (32 bytes, base64) is required
  in production; only `last4` and a SHA-256 fingerprint are stored in the clear.
  A key is verified with Paystack before it is stored, and every connection
  change needs the owner's password again and writes an audit row.
- **Payout accounts.** `POST /payments/payout-account` lists banks, resolves the
  account name, rejects an unknown bank code, and creates the platform subaccount
  (0% charge) before storing anything. Changing the bank creates a new
  subaccount; the old one is left unused in Paystack.
- The amount is the service's deposit, or its full price when no deposit is
  configured. A client-supplied amount is rejected by the strict schema.
- The webhook parses the exact bytes Paystack signed (raw-body parser scoped to
  `/api/webhooks` only) and compares HMAC-SHA512 in constant time. A bad or
  missing signature is a `401` and touches no table.
- Every delivery is stored in `payment_events` with a unique
  `eventId` (`type:transactionId`). Three identical deliveries produce one event
  row, one booking, and one ledger charge.
- A `charge.success` whose amount or currency differs from the payment leaves it
  `pending` with `failureReason: amount_mismatch`, writes an audit row, and
  returns `200` so the provider stops retrying.
- If the hold expired while the customer paid, the money is still recorded
  (`succeeded`), no booking is invented, `failureReason` becomes
  `paid_but_unscheduled`, and an owner exception is audited.
- `ledger_entries` is append-only: a Postgres trigger rejects `UPDATE` and
  `DELETE`. Amounts are signed, so a refund is a negative row.
- Refunds require the owner's password again, are full-amount only, and reverse
  the charge in the ledger (`charge + refund = 0`).

## Day 5 — quotes, invoices, jobs

| Area   | Routes                                                                                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Staff  | `POST`/`GET /quotes`, `GET /quotes/:id`, `POST /quotes/:id/versions`, `GET /jobs`, `GET /jobs/:id`, `PATCH /jobs/:id`, `POST /jobs/:id/portal-link`, `GET /intake/templates`, `GET /invoices`, `GET /invoices/:id` |
| Owner  | `POST /quotes/:id/send`, `POST`/`PUT /intake/templates`, `POST /invoices/:id/link`, `POST /invoices/:id/void`                                                                                                      |
| Public | `GET`/`POST /public/quotes/:token` (`accept`, `decline`), `GET`/`POST /public/invoices/:token` (`pay`), `GET`/`POST /public/jobs/:token` (`intake`)                                                                |

Behaviour worth knowing:

- **Quotes are versions, not edits.** Sending creates an immutable version with
  a single-purpose token; sending a revision supersedes the previous version, so
  an old link returns `409` instead of beating the new price. Totals and the
  deposit are recomputed from line items; client-supplied totals are rejected.
- **Tokens are digests.** Quote, invoice, and portal links are 32 random bytes,
  returned once, stored as SHA-256, rotatable, and rate limited. Losing a link
  means minting a new one, never reading the old one back.
- **Acceptance is atomic.** Accepting a quote, marking it accepted, and issuing
  the deposit (or full) invoice happen in one transaction. A zero-deposit quote
  gets one full invoice; nothing invents an appointment for an undated project.
- **Invoice numbers are sequential per merchant** from one atomic counter, with
  unique `(merchant_id, number)` and `(quote_version_id, kind)` indexes behind it.
  A cleared deposit issues the balance invoice exactly once.
- **Jobs follow money.** The verified payment of a deposit or full invoice
  creates one job per quote version inside the settlement transaction; balance
  payments never create a second job. Intake is validated against the attached
  template, and `delivered`/`cancelled` are terminal.
- Quote, invoice, job, and intake-template mutations write audit rows; tenant
  reads return `404` for another merchant's rows.

## What Day 1 already enforces

- **Config fails closed.** Zod-parsed at boot; placeholder or low-variety secrets
  are rejected; `CORS_ORIGINS` must be an exact origin list (single-label
  subdomain wildcards allowed, bare `*` rejected, `http` rejected in production).
- **Headers.** Helmet defaults plus `Referrer-Policy`, `Permissions-Policy`,
  `X-Request-Id`, and a production-only HSTS policy.
- **Errors.** One handler; `AppError` subclasses are client-safe, everything else
  becomes a generic 500 with the request id and no internals.
- **Logs.** Pino with redaction for authorization, cookies, passwords, OTPs,
  tokens, secrets, and card/account fields.
- **Tenancy.** `withTenant()` validates the merchant id and pins
  `app.merchant_id` for the transaction, ready for RLS in week 2.
- **Data invariants.** Migration 1 installs `btree_gist` + `pgcrypto`, enforces
  role/merchant pairing, lowercase emails with case-insensitive uniqueness,
  session and OTP time bounds, URL-safe slugs, and an append-only audit table.
- **Rate limiting.** Per-IP global limit with `Retry-After`; health routes opt out.

## Notes and current limits

- The rate-limit store is in-memory: correct for single-instance local dev only.
  The Redis-backed limiter lands with the staging deploy (PLAN.md Day 4).
- The hold sweeper is an in-process timer. It is a backstop only: correctness
  comes from the lazy sweep on every read/hold plus the exclusion constraint, so
  a second instance cannot double-book. pg-boss takes over on Day 3+ alongside
  reminder jobs.
- Live Paystack is still untested against the real API: no key has been supplied,
  so every payment test runs the sandbox adapter. The settlement decision is made
  (platform subaccount **and** the merchant's own account are both supported); the
  first live run needs test-mode keys. See [PAYMENTS.md](../docs/backend/PAYMENTS.md).
- Files/presigned uploads (M10) and the Redis-backed rate limiter are not built;
  they need a storage provider choice and a staging Redis. The in-memory limiter
  remains single-instance only.
- Receipts and dunning emails still wait on Resend. Invoices exist as
  first-class rows with public payment links; `payments` remains the source of
  truth for money already taken.
- **OTP delivery:** outside production, register/forgot-password/staff-invite
  responses include `devCode` because Resend is not wired yet. Production never
  returns it, which means production verification is blocked until email lands
  (PLAN.md Day 5).
- **Domain verification** returns `501`; DNS/TXT verification lands with the
  domains module.
- **Advisory gate:** CI runs `scripts/audit-gate.ts`, which fails on any new
  high or critical advisory. Two Prisma build-time advisories (`deepmerge-ts`,
  `effect` via `@prisma/config`) are allowlisted by package + GHSA until
  **19 Dec 2026**; the fix ships with the Prisma 7 upgrade. The exception expiry
  is enforced by the gate and covered by tests, so it cannot silently persist.
- Row-level security is not enabled yet; scoping is enforced in the service layer
  and covered by tests.
- `@prisma/client` is imported lazily in `platform/db.ts` because importing it
  loads a local `.env` as a side effect, which would bypass the config gate.
- Port 5435 is used by `docker-compose.yml` so the API does not collide with
  other local Postgres instances.

## WhatsApp and the agent

Both are opt-in per merchant and off by default. Mounted under `/api`:

| Area     | Routes                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------- |
| Settings | `GET /messaging/settings`, `PUT /messaging/settings` (owner)                                        |
| Inbox    | `GET /messaging/threads`, `GET /messaging/threads/:id`, `POST /messaging/threads/:id/reply`         |
| Agent    | `POST/GET /agent/drafts`, `POST /agent/drafts/:id/approve`, `POST /agent/drafts/:id/reject` (owner) |
| Webhook  | `GET/POST /webhooks/whatsapp` (Meta verification + signed inbound events)                           |

Behaviour worth knowing:

- **Modes.** With `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and
  `WHATSAPP_APP_SECRET` set, the API is `live` and requires
  `WHATSAPP_VERIFY_TOKEN`. Without them, development/test run a `sandbox` adapter
  that returns deterministic message ids and never touches the network; production
  returns `501` from sends instead of pretending.
- **Merchant tokens.** A merchant can connect their own Cloud API number and
  access token. The token is AES-256-GCM ciphertext; only `last4` is displayed.
- **Inbound routing.** The webhook maps `metadata.phone_number_id` to exactly one
  merchant integration, so one WhatsApp app can serve multiple tenants. An unknown
  or disabled number is acknowledged and ignored.
- **Signature and dedupe.** With an app secret configured, the raw body must carry
  a valid `X-Hub-Signature-256`; production refuses unsigned events. Each provider
  message id is unique, so a retried delivery is acknowledged without a second row.
- **Opt-out and quiet hours.** A message that is exactly `STOP`, `STOP ALL`,
  `UNSUBSCRIBE`, `CANCEL`, `END`, or `QUIT` sets `opted_out_at`. No outbound reply
  or approved agent draft can send to that thread, and nothing sends between 21:00
  and 08:00 in the merchant's timezone.
- **Agent safety.** The agent's tool allow-list is read-only
  (`business_profile`, `services`, `quote_status`); it has no discount, refund, or
  send tool. Draft generation never interpolates the free-text goal, so a prompt
  injection cannot become a price. Approval is owner-only and is the only code path
  that sends a draft, and every draft counts against `agentMonthlyDraftLimit`.
