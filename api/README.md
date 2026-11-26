# Vela API

Fastify 5 + TypeScript backend for the Vela React client (`client/`). This is the
Day 1 foundation described in [PLAN.md](../docs/backend/PLAN.md); the binding
design lives in [ARCHITECTURE.md](../docs/backend/ARCHITECTURE.md) and
[SECURITY.md](../docs/backend/SECURITY.md).

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
  platform/        config, logger, errors, db (withTenant), cors
  shared/          money (integer kobo)
  types/           Fastify type augmentation
prisma/
  schema.prisma    Day 1 tables: merchants, users, sessions, otp_codes, audit_logs
  migrations/      Hand-written SQL including constraints Prisma cannot express
test/
  unit/            Pure logic and security contracts
  integration/     Real Postgres: health, tenant scoping, append-only audit
```

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
- Row-level security is not enabled yet; scoping is enforced in the service layer
  and covered by tests.
- `@prisma/client` is imported lazily in `platform/db.ts` because importing it
  loads a local `.env` as a side effect, which would bypass the config gate.
- Port 5435 is used by `docker-compose.yml` so the API does not collide with
  other local Postgres instances.
