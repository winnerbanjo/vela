# Vela API

Fastify 5 + TypeScript backend for the shipped Vela dashboard
(`node server.js` → http://localhost:3030/dashboard). This is the Day 1
foundation described in [PLAN.md](../docs/backend/PLAN.md); the binding design
lives in [ARCHITECTURE.md](../docs/backend/ARCHITECTURE.md) and
[SECURITY.md](../docs/backend/SECURITY.md), and the frontend contract is
[DASHBOARD_CONTRACT.md](../docs/backend/DASHBOARD_CONTRACT.md).

`client/` is a separate React SPA kept temporarily; it is not at 3030 and is no
longer the contract of record.

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
  modules/staff/     invites, roles, removal
  platform/        config, logger, errors, db (withTenant), auth guards, audit, cors
  shared/          money (integer kobo), slug
  types/           Fastify type augmentation
prisma/
  schema.prisma    Day 1 tables: merchants, users, sessions, otp_codes, audit_logs
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
- **OTP delivery:** outside production, register/forgot-password/staff-invite
  responses include `devCode` because Resend is not wired yet. Production never
  returns it, which means production verification is blocked until email lands
  (PLAN.md Day 5).
- **Domain verification** returns `501`; DNS/TXT verification lands with the
  domains module.
- **Advisory gate:** `npm audit --omit=dev` reports high advisories for
  `deepmerge-ts`/`effect` (through `@prisma/client` → `prisma` → `@prisma/config`)
  and `zod` 3.x. Both fixes are major upgrades (Prisma 7, zod 4) and are tracked
  as the next dependency task; CI's high-severity audit step will stay red until
  then.
- Row-level security is not enabled yet; scoping is enforced in the service layer
  and covered by tests.
- `@prisma/client` is imported lazily in `platform/db.ts` because importing it
  loads a local `.env` as a side effect, which would bypass the config gate.
- Port 5435 is used by `docker-compose.yml` so the API does not collide with
  other local Postgres instances.
