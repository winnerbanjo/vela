# Vela API

Fastify 5 + TypeScript backend for the shipped Vela dashboard
(`node server.js` → http://localhost:3030/dashboard). This is the Day 1
foundation described in [PLAN.md](../docs/backend/PLAN.md); the binding design
lives in [ARCHITECTURE.md](../docs/backend/ARCHITECTURE.md) and
[SECURITY.md](../docs/backend/SECURITY.md), and the frontend contract is
[DASHBOARD_CONTRACT.md](../docs/backend/DASHBOARD_CONTRACT.md).

Status: Day 4 — payments, the signed Paystack webhook, and an append-only ledger
sit on top of Day 2 identity/catalogue and Day 3 scheduling. `client/` is a separate React SPA kept temporarily; it
is not at 3030 and is no longer the contract of record.

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

| Area    | Routes                                                                                     |
| ------- | ------------------------------------------------------------------------------------------ |
| Public  | `POST /payments/initialize` (from a live hold)                                             |
| Staff   | `GET /payments`, `GET /payments/:reference`, `GET /payments/ledger/entries`                |
| Owner   | `POST /payments/:id/refund` (password step-up)                                             |
| Webhook | `POST /webhooks/paystack` (raw body, `x-paystack-signature`, deduped by provider event id) |

Behaviour worth knowing:

- **Modes.** `PAYSTACK_SECRET_KEY` set → `live`. No key outside production →
  `sandbox`, which returns deterministic checkout/refund fixtures without a
  network call, so the whole flow is testable. No key in production →
  `disabled`: money routes return `501` instead of pretending to charge.
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
- Live Paystack is untested against the real API: no key has been supplied, so
  every payment test runs the sandbox adapter. The first live run needs test-mode
  keys and a settlement decision (direct merchant vs platform subaccount).
- Files/presigned uploads (M10) and the Redis-backed rate limiter are not built;
  they need a storage provider choice and a staging Redis. The in-memory limiter
  remains single-instance only.
- Receipts, invoices, and dunning emails wait on Resend (Day 5). `payments` is the
  source of truth for money already taken.
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
