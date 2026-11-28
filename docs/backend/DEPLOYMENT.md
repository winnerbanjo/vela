# Deployment

Target layout:

| Piece    | Host                          | Notes                                          |
| -------- | ----------------------------- | ---------------------------------------------- |
| Dashboard | `https://app.myvela.ng`      | Static repository root on Vercel               |
| API       | `https://api.myvela.ng`      | Container from `api/Dockerfile`, port 5050     |
| Worker    | private service              | Same image, `node dist/apps/worker/main.js`    |
| Database  | managed PostgreSQL 16        | TLS required; migrations run before the API    |

## Current state (2026-11-28)

`app.myvela.ng` already resolves to Vercel, but the domain returns
`DEPLOYMENT_NOT_FOUND` (`x-vercel-error`): no production deployment is attached
to it yet. Attaching the domain to the project's production deployment is the
remaining dashboard step and needs access to the Vercel team that owns
`winnerbanjos-projects/vela`.

The API has not been deployed anywhere yet. No Paystack, WhatsApp, or email
credentials have been supplied, so a production deployment would start with
platform money routes returning `501` and WhatsApp disabled. That is deliberate:
the API fails closed.

## 1. Dashboard on Vercel

Project settings for the existing project (framework preset **Other**):

- Root directory: repository root (`.`)
- Build command: none
- Output directory: `.`
- Install command: none

`vercel.json` at the root turns on clean URLs (`/dashboard` serves
`dashboard.html`) and sets `nosniff`, frame, referrer, permissions-policy, HSTS,
and HTML cache headers.

Steps:

1. Deploy the branch that contains the dashboard to production.
2. Project → Settings → Domains → add `app.myvela.ng` (and `www` if wanted).
3. In DNS, point `app` at the record Vercel shows (`cname.vercel-dns.com` for a
   CNAME, or the shown A record at the apex). Do not change MX records.
4. Confirm `curl -I https://app.myvela.ng/dashboard` returns `200` and the
   security headers above.

The dashboard is still demo-data. Wiring it to the API is the next workstream;
when that lands, set the API base URL in the dashboard configuration and add the
origin to the API's `CORS_ORIGINS`.

## 2. API container

Build and push from the `api/` directory:

```bash
docker build -t registry.example.com/vela-api:<tag> .
docker push registry.example.com/vela-api:<tag>
```

The image runs as a non-root user, exposes 5050, and has a readiness
healthcheck against `/health/ready`. Run the API with the default command and the
worker with the override:

```bash
# migrations, once per release, before the new API starts
docker run --rm --env-file /run/secrets/vela.env \
  registry.example.com/vela-api:<tag> npx prisma migrate deploy

# API
docker run -p 5050:5050 --env-file /run/secrets/vela.env \
  registry.example.com/vela-api:<tag>

# worker
docker run --env-file /run/secrets/vela.env \
  registry.example.com/vela-api:<tag> node dist/apps/worker/main.js
```

Migrations are forward-only. Roll back by redeploying the previous image only if
its schema expectations still hold; otherwise restore from the pre-deploy backup.

## 3. Production environment

| Variable | Required | Value / notes |
| --- | --- | --- |
| `NODE_ENV` | yes | `production` |
| `PORT` | yes | `5050` |
| `HOST` | yes | `0.0.0.0` |
| `DATABASE_URL` | yes | managed Postgres, `sslmode=require` |
| `JWT_SECRET` | yes | 48+ random bytes (`openssl rand -base64 48`) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | no | defaults are fine |
| `CORS_ORIGINS` | yes | `https://app.myvela.ng` (comma separate any others) |
| `TRUST_PROXY` | yes | `true` behind the platform proxy |
| `PAYMENT_ENCRYPTION_KEY` | yes | 32 bytes base64 (`openssl rand -base64 32`) |
| `PAYSTACK_SECRET_KEY` | for money | platform account secret key |
| `PAYSTACK_API_BASE` | no | defaults to `https://api.paystack.co` |
| `WHATSAPP_ACCESS_TOKEN` | for messaging | Cloud API system-user token |
| `WHATSAPP_PHONE_NUMBER_ID` | for messaging | platform number id |
| `WHATSAPP_APP_SECRET` | for messaging | required to verify inbound signatures |
| `WHATSAPP_VERIFY_TOKEN` | with messaging | 8+ random characters, also entered in Meta |
| `AGENT_MODE` | no | `sandbox` (rules drafts) or `disabled` |
| `RECONCILIATION_INTERVAL_MINUTES` | no | default `360`; `0` disables the worker timer |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_PUBLIC_MAX` | no | defaults 300 / 60 per minute |

Never bake an env file into the image; `api/.env` is ignored and
`api/.dockerignore` excludes it.

## 4. Webhooks and domains

Register these after the API hostname is live:

- Paystack: `https://api.myvela.ng/api/webhooks/paystack`
  (platform account and every merchant that connects in direct mode)
- WhatsApp: `https://api.myvela.ng/api/webhooks/whatsapp`
  (callback URL; verify token = `WHATSAPP_VERIFY_TOKEN`)

`app.myvela.ng` and `api.myvela.ng` are same-site (`myvela.ng`), so the
`SameSite=Lax` session cookie set by the API is sent on dashboard requests as
long as the dashboard uses `credentials: 'include'`. Production uses the
`__Host-vela_session` cookie name, which requires HTTPS and path `/`.

## 5. Verification

```bash
curl -s https://api.myvela.ng/health/live
curl -s https://api.myvela.ng/health/ready
curl -I https://api.myvela.ng/api/quotes        # 401 without a session
curl -I https://app.myvela.ng/dashboard         # 200 + security headers
```

Then run one sandbox-journey smoke test against production with real
credentials before enabling live payments: register → OTP → login → create a
service → hold → checkout (test key) → webhook → booking. Record the result with
the release tag.

## 6. Launch blockers

- Dashboard domain attachment (Vercel access) and the UI-to-API wiring.
- API hostname, managed Postgres, and secret storage.
- Paystack keys for live money (sandbox works today).
- Transactional email. In production the OTP is not returned in the response, so
  without an email provider nobody can verify a new account. This needs Resend
  (or equivalent) before public sign-ups.
- Redis for shared rate limiting if more than one API instance runs. The current
  limiter is per-process and documented as single-instance.
- Off-site backup and one restore rehearsal.
