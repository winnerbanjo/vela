# Vela Backend — One-Week Execution Plan

**Window:** Day 1 = Thu 26 Nov 2026 → Day 7 = Wed 2 Dec 2026 (one working week, ~56–64 focused hours)
**Inputs:** [VELA_PRD.md](../../VELA_PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [SECURITY.md](./SECURITY.md)

The week is only survivable if scope is frozen before code starts. This plan freezes it, sequences it so security is structural rather than bolted on, and defines what gets cut first.

---

## 1. Reality check

One week builds **one complete vertical slice plus one second journey**, not the whole PRD. The PRD describes eight surfaces, five integrations, and a full CRM. That is a quarter of work. What we can honestly deliver in seven days:

- A production-shaped API with working auth, tenancy, catalogue, scheduling, bookings, payments, and jobs.
- Journey A (barber: availability → hold → deposit → confirmation) working end-to-end against the real React client.
- Journey B (photography: quote v1/v2 → acceptance → deposit → job + intake) working end-to-end.
- WhatsApp and the AI agent behind flags, with one happy path proven if vendor credentials arrive by day 5; otherwise adapters + tests with recorded fixtures.
- Security controls from SECURITY.md §0–§10 enforced, with the S16 security test suite green.

What we will **not** have: campaign builder UI, external prospect discovery, custom domain purchase, full analytics, native mobile, multi-currency, enterprise SSO. Saying this now is what prevents a day-7 scramble.

---

## 2. Scope lock

### Must (P0 — blocks the demo)

| ID | Deliverable | Acceptance |
| --- | --- | --- |
| M1 | Boot: config validation, logging, health, Docker Postgres, CI, migrations, `.env.example` | `docker compose up` → `/health/ready` 200 |
| M2 | Auth: register → OTP → login → refresh → logout; staff invites; RBAC | S7, S8, S9, S13 |
| M3 | Tenancy: merchant, location, settings, timezone; tenant guard on every query | S5 |
| M4 | Catalogue: services, categories, portfolio, reviews (public read + owner write) | Client service pages render real data |
| M5 | Schedule + availability engine (buffers, shifts, blocks) | PRD 45+10 example unit-tested |
| M6 | Booking with hold + exclusion constraint + walk-in | S1, S10, S11 |
| M7 | Paystack checkout, verified webhook, ledger, receipt, refund | S2, S3, S4 |
| M8 | Quotes with immutable versions, invoices, deposit, acceptance token | S12 |
| M9 | Jobs + intake + client portal token + delivery states | Journey B step 4–5 |
| M10 | Files: presigned upload/download, tenant-scoped access | S6, S14 |
| M11 | Admin: stats, providers, bookings, transactions read paths; audit log | Admin portal loads |
| M12 | Security suite S1–S18 + OpenAPI + README runbook | CI green; suite green |

### Should (P1 — ship if day 4–5 goes well)

- WhatsApp inbound/outbound adapter with signature verification and opt-out.
- Agent: classification + availability lookup + draft reply + owner approval task.
- Today/dashboard summary endpoint beyond the current `/dashboard/summary`.
- Reconciliation job and owner-facing exception list.
- Email via Resend (OTP fallback to console in dev).

### Won't (P2 — explicitly out)

- External prospect discovery, CSV campaign builder UI, A/B messaging.
- Domain purchase (contract stub returns `501` with a typed error).
- Flutterwave/Stripe, multi-currency, payouts automation.
- Postgres RLS, WAF, antivirus, MFA (see accepted risks).

**Cut order if behind (cut from the bottom up):** P2 → agent → WhatsApp outbound → Today endpoint → reviews → portfolio → staff invites → admin write paths. Never cut: tenancy, hold constraint, webhook verification, audit, file scoping, tests S1/S2/S5/S6.

---

## 3. Acceptance test → build map

| PRD # | Test | Built by | Verified |
| --- | --- | --- | --- |
| 1 | Campaign link → attributable paid job | M8 + P1 campaigns | Day 6 if P1 |
| 2 | Two customers, last slot → one hold | M6 | Day 3 |
| 3 | Superseded quote cannot be accepted | M8 | Day 4 |
| 4 | Undated project quote → deposit, no fake appointment | M8 | Day 4 |
| 5 | Webhook ×3 → one allocation/receipt/job | M7 | Day 3 |
| 6 | Deposit after expiry → money visible, exception flagged | M7 | Day 5 |
| 7 | Payment screenshot → recorded, verification task | M7 (manual path) | Day 5 |
| 8 | Duplicate/opted-out import suppressed | P1 messaging | Day 6 if P1 |
| 9 | Reply while follow-up queued → follow-up cancelled | P1 messaging | Day 6 if P1 |
| 10 | Human takeover cancels AI reply | P1 agent | Day 6 if P1 |
| 11 | Reschedule cancels old reminders | M6 + worker | Day 3 |
| 12 | Cross-tenant file access rejected | M10 | Day 4 |
| 13 | WhatsApp down → alert, no false delivery | P1 adapter | Day 6 if P1 |
| 14 | Legacy links resolve | Migration notes only | Day 7 |
| 15 | Zero prospects → empty state | P2 | Not this week |

---

## 4. Day-by-day

Each day ends with: tests green, a short demo, a commit trail, and an updated risk note. Budget assumes one backend engineer; with two, run Track A (identity/catalogue) and Track B (scheduling/payments) in parallel from Day 2 and merge at the contract.

### Day 1 — Foundation and guardrails (Thu 26 Nov)

**Goal:** nothing can be built unsafely later.

- Scaffold `api/` (Fastify 5, strict TS, tsx, Vitest, ESLint, Prettier, `docker-compose.yml` for Postgres 16).
- `platform/config.ts` — Zod-validated env; boot fails on missing secrets.
- `platform/logger.ts` — Pino with redaction; request ID plugin.
- `platform/errors.ts` — `AppError` hierarchy + one error handler.
- `platform/db.ts` — Prisma client, `withTenant()` helper, transaction wrapper.
- Prisma schema v0: `merchants`, `users`, `sessions`, `otp_codes`, `audit_logs`.
- Migration 1 includes `CREATE EXTENSION btree_gist`.
- `/health/live`, `/health/ready`; Helmet, CORS allow-list, body limits, rate-limit skeleton.
- CI: typecheck → lint → unit → integration (Postgres service) → audit → gitleaks.
- `.env.example` with placeholders; confirm `.env` is ignored.

**Exit:** fresh clone → `docker compose up` → `npm run dev` → health 200; CI green on an empty test.
**Security gate:** no real secrets, no permissive CORS, boot fails when `JWT_SECRET` is missing.

### Day 2 — Identity, tenancy, catalogue (Fri 27 Nov)

- Auth flows: register, OTP issue/verify (hashed, TTL, attempts), login, refresh rotation + reuse detection, logout, forgot/reset.
- Argon2id module + password policy; constant-time comparisons; login throttling.
- `requireAuth`, `requireRole`, `requireMerchant`; `AuthContext` on every request.
- Staff create/list/delete with invite token; role matrix from SECURITY.md §3.1.
- Merchant profile, location, settings, timezone, slug.
- Services, categories (reorder), portfolio, reviews with public read endpoints matching `client/src/lib/api.ts`.
- Audit log helper wired into role/profile/payout mutations.

**Exit:** register → OTP → login → `/auth/me` works from the React app on `:3002`; cross-tenant read returns 404.
**Security gate:** S5, S7, S8, S9, S13.

### Day 3 — Scheduling and the booking race (Sat 28 Nov)

- Availability rules, overrides, blackout dates, lead time.
- Pure availability engine + unit tests for the PRD example and timezone edges (DST-free Lagos, but test a DST zone anyway).
- `resource_allocations` with the `btree_gist` exclusion constraint (raw SQL migration).
- Holds (15 min TTL), release, expiry sweeper job (pg-boss), outbox dispatcher.
- `POST /bookings` (hold → optional Paystack init → confirm), walk-in path, reschedule, cancel, stats.
- Booking state machine + transition allow-list.

**Exit:** acceptance #2 passes under 50 parallel requests; hold expires and frees the slot.
**Security gate:** S1, S10, S11; client-supplied `endTime` and price ignored (asserted in tests).

### Day 4 — Money (Sun 29 Nov)

- Paystack adapter (init, verify, refund) with timeouts and typed errors.
- Webhook route with raw-body capture, HMAC-SHA512 + timestamp, dedupe, fast 200.
- `payments`, `payment_events`, `ledger_entries`, `invoices`, `invoice_line_items`.
- Receipt generation (email/WhatsApp via outbox), manual transfer verification path.
- Refund flow with step-up auth and audit.
- Redis-backed rate limiter (or documented single-instance fallback).
- Files: presigned upload/download, MIME/size enforcement, tenant checks.

**Exit:** test-mode payment confirms exactly one booking; webhook ×3 → one ledger entry; cross-tenant file read refused.
**Security gate:** S2, S3, S4, S6, S12, S14.

### Day 5 — Quotes, invoices, jobs (Mon 30 Nov)

- Opportunities + quote drafts; version snapshots; send with hashed share token + validity.
- Public quote view/accept (latest only, expiry, atomic); decline; supersede.
- Invoice generation from accepted version; deposit and balance; undated project path (no allocation).
- Job creation on verified deposit; intake templates + submissions; portal token; delivery states.
- Exception handling: paid-but-unscheduled, amount mismatch, expired hold.
- Reconciliation job skeleton.

**Exit:** Journey B runs end-to-end in the browser; v1 acceptance after v2 returns 409.
**Security gate:** share tokens hashed and single-purpose; quote totals recomputed; audit on send/accept.

### Day 6 — Integrations behind flags, admin, hardening (Tue 1 Dec)

- WhatsApp adapter: webhook verification, thread upsert, template/session send, opt-out, quiet hours, caps.
- Agent: context builder, tool allow-list (availability, catalogue, quote status), draft + approval task, budget cap; feature-flagged per merchant.
- Admin read surfaces + verification queue; dashboard summary.
- Run S1–S18; fix findings; add load smoke test for availability and booking.
- Deployment to staging; migrations applied; smoke test through the public URL.

**Exit:** staging URL serves the React app against the new API; all P0 tests green.
**Security gate:** full suite green; no high/critical audit findings; headers verified with `curl -I`.

### Day 7 — Buffer, demo, handoff (Wed 2 Dec)

- Fix only P0 bugs; no new features after 12:00.
- Seed demo data: one barbershop (2 chairs, deposit), one photographer (quote flow).
- Run the PRD acceptance script live; record results in `docs/backend/DEMO.md`.
- Finalize `openapi.json`, README runbook, env var table, incident/rollback notes.
- Retro: what shipped, what is flagged off, known gaps, week-2 backlog.

**Exit:** demo passes without a manual database edit; handoff doc lets someone else run the system.

---

## 5. Daily rhythm

| Time | Activity |
| --- | --- |
| Start (15 min) | Pick the day's 3 outcomes; confirm vendor credentials/blockers |
| Midday | Deploy to staging; run the day's security tests early, not at 23:00 |
| End (30 min) | Demo the day's slice; update PLAN.md status; log risks |

**Engineering workflow**

- Trunk-based: short-lived branches (`feat/booking-hold`), squash merge, CI required.
- PR size ≤ 400 changed lines; one concern per PR; migration PRs reviewed separately.
- Definition of Done per endpoint: schema, handler, service test, denial test, OpenAPI entry, audit (if mutating), rate limit (if public).
- No `TODO` without an issue link. No commented-out code. No `any` in domain code (`unknown` + narrowing is fine).
- Migrations: forward-only, named `NNNN_description`, reviewed against a production-like dump.
- Feature flags in `merchant_settings.flags` for agent, WhatsApp, pay-later, bank transfer.

---

## 6. Risk register

| Risk | Likelihood | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| Vendor credentials arrive late (Paystack/WhatsApp/OpenAI) | High | High | Adapters + fixtures; sandbox mode; test keys requested Day 1 | No keys by Day 3 → ship adapter tests only |
| Scope creep from "one more surface" | High | High | Scope lock §2; new asks go to week-2 backlog | Any unplanned item |
| Booking race passes locally, fails on staging | Medium | High | Concurrency test against real Postgres; run in CI, not manually | Failure under 50 parallel |
| Client contract drift (shapes differ from `api.ts`) | Medium | Medium | Contract tests generated from the client's types on Day 2 | A screen breaks |
| Timezone/buffer off-by-one | Medium | Medium | Unit tests with fixed clocks; UTC storage; explicit tz conversion at edges | Any mismatch in demo |
| One engineer unavailable | Medium | High | P0 order allows stopping after Day 5 with Journeys A+B working | Absence > 4 h |
| Security controls treated as "later" | Medium | High | Day 1 guardrails + per-day gates; checklist in PR template | Gate red at demo |
| Staging/procurement delay | Medium | Medium | Local Docker demo is the fallback; deploy artifacts ready Day 4 | No staging by Day 5 |

---

## 7. What I need from you (decisions and access)

1. **Confirm scope lock** in §2 — especially that campaigns/prospect discovery are out.
2. **Paystack test keys** + confirmation of the settlement account model (direct merchant vs platform subaccount).
3. **Hosting choice** (Render / Fly / DigitalOcean App Platform) and who owns the account.
4. **OpenAI + WhatsApp** keys, or an explicit "flag off this week".
5. **Frontend confirmation** on localStorage → cookie migration (one small change in `client/src/lib/api.ts` + `AuthContext`).
6. **Brand/domain** for `api.` so CORS and cookie domains are correct.

Until 2–4 exist, I build against adapters with recorded fixtures and a `sandbox` flag, so nothing blocks.

---

## 8. Definition of done (Friday)

- [ ] `docker compose up` + migrations + seed → API and worker healthy.
- [ ] Journey A and Journey B complete in the browser against the real client.
- [ ] S1–S18 green in CI (with vendor-dependent tests clearly marked `sandbox`).
- [ ] `openapi.json` committed and matching routes.
- [ ] No secrets in git (`gitleaks`), no high/critical `npm audit`.
- [ ] Every money/role/booking mutation has an audit row.
- [ ] Rate limits verified with a looped request (429 + `Retry-After`).
- [ ] Restore from backup tested once, or documented as untested with a date.
- [ ] README: run, migrate, seed, deploy, rollback, env table.
- [ ] Known gaps written down, not remembered.
