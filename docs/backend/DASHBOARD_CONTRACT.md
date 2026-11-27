# Shipped Dashboard — Frontend Contract

**Status:** authoritative frontend reference for backend work (27 Nov 2026)
**Decision:** the dashboard the product owner will ship is the one served at
`http://localhost:3030/dashboard` by the root static app. `client/` is retained
until the gaps listed in §7 are closed; it is no longer the contract of record.

---

## 1. Which app serves `localhost:3030/dashboard`

| Evidence | Result |
| --- | --- |
| `server.js` line 5 | `const PORT = 3030` — the root Node server owns port 3030 |
| `server.js` route aliases | `'/dashboard': '/dashboard.html'` |
| `dashboard.html` line 1997 | loads `/dashboard/workspace.js`, plus `/dashboard/workspace.css` |
| `client/vite.config.ts` | Vite dev server on `3000` (`3002` when 3000/3001 are taken), no dashboard entry at 3030 |
| `client/vercel.json` | SPA rewrite for the separate React build |

The 3030 dashboard is the **root app**: `dashboard.html` + `dashboard/workspace.js`
(7,280 lines) + `dashboard/workspace.css`, served by `node server.js`. It also
serves the marketing pages, login/register, storefront and knowledge base.

> **Duplicate to resolve:** `dashboard/index.html` is byte-identical to
> `dashboard.html` (both 1,999 lines, verified 27 Nov 2026). `/dashboard` serves
> `dashboard.html`; the copy is reachable only at `/dashboard/index.html`.
> Change both or delete the copy — do not let them drift.

`client/` builds a React SPA with its own routes (`/dashboard`, `/admin/...`,
`/p/:slug`, etc.), its own `src/lib/api.ts`, and a `/api` proxy to `:5050`. It
does not run on 3030 and never serves `dashboard.html`.

---

## 2. What the dashboard is today

- All merchant data lives in `localStorage` under `vela.preview.workspace.v1`
  (`dashboard/workspace.js` lines 6, 198–220). First load seeds
  `defaultWorkspace` — Studio Teni demo merchant, services, bookings,
  conversations, galleries and a sales profile.
- `login.html` and `register.html` are demo-only: neither calls an API. Login
  waits 500 ms then redirects to `/dashboard`; register shows an alert.
- Only integration surfaces hit a server. `dashboard/workspace.js` makes 14
  live calls, all to `server_api.js` on the same origin:

  | Call | Where |
  | --- | --- |
  | `POST /api/apps/save-keys` | connect provider, save payment keys |
  | `GET /api/apps/credentials?appId=` | provider setup panel |
  | `POST /api/apps/rotate-key` | rotate provider key |
  | `GET /api/apps/payment-gateways` | default gateway selector |
  | `POST /api/apps/currency-default` | default currency |
  | `POST /api/apps/regenerate-subscription` | calendar subscription |
  | `POST /api/apps/webhook-waiting` | webhook listener status |
  | `POST /api/webhooks/test-trigger` | send a test event |
  | `POST /api/whatsapp/approve-reply` | approve/reject a drafted reply |
  | `POST /api/retry` | retry a failed sync |
  | `GET /api/calendar/subscribe?token=` | ICS calendar feed |
  | `GET /api/webhooks/{paystack,flutterwave,stripe}` | vendor webhooks (server side) |

- `window.VelaPaymentGateway` (line 7104) fakes checkout and payment
  verification in the browser and writes `workspace.transactions`. This must be
  replaced by server-created checkouts and verified webhooks.
- Storefront booking (`storefront.html`) reads the same `localStorage`
  workspace; it does not call a booking API.

**Implication:** the dashboard defines the *screens and data shapes* the API must
serve. It does not define an API that already exists, except for the integration
endpoints in the table above.

---

## 3. Screens the backend must power

Sections come from `sections` in `dashboard/workspace.js` and `renderPage()`:

| Section | Route | Data it renders | Writes it makes today |
| --- | --- | --- | --- |
| Agent | `#agent` | Sales tasks, campaign drafts, sales profile, decision prompts | Sales profile edits, campaign stage |
| Inbox | `#inbox` | Conversations (`channel`, `sender`, `message`, `context`, `draftText`, `status`), approval counts, inbox mode (`draft`/`auto`) | Approve/edit/dismiss reply, set mode |
| Bookings | `#bookings` | `bookingsList` (`id`, client, phone, service, `dateSlot`, staff, total, deposit, balance, status, notes, source) | Add walk-in, reschedule, status change |
| Clients | `#clients` | `clientsDirectory` (name, company, phone, email, spend, visits, last service/date, notes) | None (read-only list) |
| Money | `#money` | Money stat cards, ledger rows (reference, client, service, total, deposit, balance, status) | Created by booking/payment paths |
| Website | `#website` | Profile (name, slug, trade, location, bio, phone, email, walk-ins, custom domain, publish state) | Edit profile, connect domain, publish |
| Services | `#services` | `servicesList` (name, duration, buffer, price, deposit, staff, status, description) | Add, archive/restore |
| Gallery | `#gallery` | Client galleries (title, client, email, event date, status, cover, source, photo count) and lookbook `photos` | Add/import photos, publish |
| Settings | `#settings` | Channels, sales profile, booking policy, profile | Edit channels and policies |
| Connected apps | `#apps` | 15-provider catalogue, credentials, webhook and health state, gateway defaults | Connect, disconnect, save/rotate keys, test |

---

## 4. Resource map (dashboard shape → database)

Money is displayed in naira (₦) but the API stores **integer kobo**
(`api/src/shared/money.ts`). The dashboard converts at render time; it never
sends floats.

| Dashboard field(s) | Backend resource | Notes |
| --- | --- | --- |
| `name`, `slug`, `trade`, `location`, `bio`, `phone`, `email`, `customDomain`, `customDomainVerified` | `merchants` | `slug` URL-safe; domain verification is server state |
| `serviceAreaOnly`, `walkIns`, `inboxMode`, booking policy | `merchant_settings` | Policy values validated server-side |
| `channels.{whatsapp,email,instagram,tiktok}` | `integrations` / `channel_accounts` | `connected`, identity, last sync are server facts |
| `servicesList[].{id,name,duration,buffer,price,deposit,staff,status,desc}` | `services` (+ `staff_services`) | `price`/`deposit` in kobo; `status` `active`/`archived` |
| `bookingsList[].{id,clientName,clientPhone,serviceName,dateSlot,staff,totalPrice,depositPaid,balanceDue,status,notes,source}` | `bookings` (+ `resource_allocations`) | Dates are ISO 8601 timestamps; `dateSlot` is a display label; status is derived from the booking state machine |
| `clientsDirectory[].{name,company,phone,email,spend,visits,lastService,lastDate,notes}` | `customers` (+ aggregates) | Spend/visits are aggregates, not stored counters |
| `conversations[].{id,channel,sender,phone,email,handle,status,message,context,draftText,actionLabel,isQuote}` | `conversations` + `message_drafts` | `status` today: `needs_approval`, `routine_replied`; `draftText` is a generated draft awaiting approval |
| `transactions[].{id,reference,provider,merchantId,bookingId,invoiceId,clientName,service,totalAmount,expectedAmount,amountReceived,balanceDue,currency,customerPaymentStatus,bankSettlementStatus,createdAt,verifiedAt,externalInvoiceId}` | `payments`, `payment_events`, `ledger_entries` | Created only from verified provider events, never from the browser |
| `clientGalleries[].{id,title,clientName,clientEmail,eventDate,status,coverPhoto,source,sourceAccount,sourceFolder,photosCount,photos}` | `galleries`, `gallery_photos` | Public share links use hashed tokens |
| `photos[].{id,title,serviceId,serviceName,category,src,isCover}` | `portfolio_items` | Files live in R2; `src` is a signed URL |
| `salesProfile.{trade,priorityServiceId,priorityServiceName,priorityPrice,priorityDuration,priorityDeposit,buyingJourney,customerFriction,proofAssetUrl,proofAssetTitle,targetLocation,quietPeriods,campaignStage}` | `sales_profiles` | AI input; tenant-scoped, never public |
| `connectedApps` | `integrations` | Credentials encrypted at rest (see SECURITY.md §6) |

---

## 5. API surface required by the dashboard

Base path `/api` (v1). All merchant routes require a session and are scoped to
one merchant; another merchant's id returns `404`.

| Area | Endpoints | Notes |
| --- | --- | --- |
| Auth | `POST /auth/register`, `/auth/verify-otp`, `/auth/resend-otp`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me` | Replaces the demo login/register. Dashboard reads `{ message }` on error. |
| Merchant | `GET/PATCH /merchant`, `POST /merchant/publish`, `POST /merchant/domain`, `POST /merchant/domain/verify` | Publish toggles `hasUnpublishedChanges` |
| Services | `GET/POST /services`, `PATCH/DELETE /services/:id`, `POST /services/:id/archive`, `POST /services/:id/restore` | Price and deposit in kobo |
| Staff | `GET/POST /staff`, `PATCH/DELETE /staff/:id` | Staff display names match service assignments |
| Schedule | `GET/PUT /schedule`, `GET /availability?serviceId=&date=` | Buffers and shifts per SECURITY/ARCHITECTURE |
| Bookings | `GET /bookings?date=&staffId=&source=`, `POST /bookings`, `PATCH /bookings/:id`, `POST /bookings/:id/reschedule`, `POST /bookings/:id/status` | Walk-in is `POST /bookings` with `source: walk_in` |
| Clients | `GET /clients`, `GET /clients/:id` | Aggregates computed from bookings/payments |
| Money | `GET /money/summary`, `GET /money/ledger` | Summary: invoiced, verified deposits, outstanding |
| Inbox | `GET /conversations?status=`, `GET /conversations/:id`, `PATCH /conversations/:id/mode`, `POST /conversations/:id/draft`, `POST /conversations/:id/approve`, `POST /conversations/:id/dismiss` | Approve is the only path that sends |
| Gallery | `GET/POST /galleries`, `PATCH /galleries/:id`, `POST /galleries/:id/photos`, `GET /portfolio`, `POST /portfolio`, `DELETE /portfolio/:id` | Upload via presigned URL first |
| Sales profile | `GET/PATCH /sales-profile` | Flag-gated agent input |
| Dashboard | `GET /dashboard/summary`, `GET /dashboard/today` | Cards and today's list |
| Integrations | `GET /apps`, `GET /apps/payment-gateways`, `GET /apps/:id/credentials`, `POST /apps/:id/keys`, `POST /apps/:id/connect`, `POST /apps/:id/disconnect`, `POST /apps/:id/rotate-key`, `POST /apps/:id/currency-default`, `POST /apps/:id/regenerate-subscription`, `POST /apps/webhook-waiting`, `POST /webhooks/test-trigger`, `POST /retry` | Route names kept where the dashboard already calls them |
| Calendar | `GET /calendar/subscribe?token=` | Token is opaque, hashed at rest; ICS content type |
| Vendor webhooks | `POST /webhooks/paystack`, `/webhooks/flutterwave`, `/webhooks/stripe`, `/webhooks/whatsapp` | Raw body, signature verified, idempotent |

### Contract rules

- Errors: `{ message, code, requestId, details? }` — `message` is what the
  dashboard displays.
- Status strings: the API returns machine values (`confirmed`, `deposit_paid`,
  `needs_approval`); the dashboard owns display labels (`Confirmed · Deposit Paid`).
- Dates: ISO 8601 UTC in the API; the dashboard formats `dateSlot` and
  `eventDate` for display. No pre-formatted dates from the server.
- Money: integer kobo in the API; the dashboard divides by 100 for ₦ display.
- Pagination: `?page=&limit=` → `{ data, pagination: { page, limit, total, totalPages } }`.
- Idempotency: `Idempotency-Key` required on booking creation, approvals and any
  payment action.

---

## 6. Where this differs from `client/src/lib/api.ts`

`client/src/lib/api.ts` used `businessName`, numeric naira prices, a single
`/dashboard/summary`, and `localStorage.token`. Where the two disagree, the
dashboard wins:

| Concern | `client/` | Dashboard (authoritative) |
| --- | --- | --- |
| Merchant name | `businessName` | `name` |
| Service fields | `category`, `price` (naira), `capacity` | `duration`, `buffer`, `price`, `deposit`, `staff`, `status`, `desc` |
| Booking creation | customer object + `timeSlot`, `paymentType` | walk-in plus public storefront flow; deposit derived server-side |
| Money listing | `/payments/transactions`, `/admin/*` | `/money/ledger` + `/money/summary` |
| Inbox | none | conversations with draft approval |
| Auth token | `localStorage.token` + Bearer | Same-origin session cookie; Bearer kept only for tooling |
| Admin portal | full `/admin/*` surface | not part of the shipped dashboard |

New code should read this document, not `client/src/lib/api.ts`.

---

## 7. What `client/` still owns before it can be removed

Nothing here exists in the root app. Capture or port it first; deleting `client/`
without a decision loses the only implementation.

| # | Capability | Where it lives | Needed before removal? |
| --- | --- | --- | --- |
| 1 | Real auth screens and session handling (register, login, OTP, resend, forgot/reset, `AuthContext`, protected routes) | `client/src/pages/Login.tsx`, `Register.tsx`, `VerifyOtp.tsx`, `client/src/contexts/AuthContext.tsx` | **Yes** — root login/register are demo-only until wired to the new API |
| 2 | Admin portal (stats, providers, bookings, customers, transactions, payouts, refunds, risk, settings, receipt verification) | `client/src/pages/admin/*` (11 pages) and `client/src/components/admin/*` | **Yes** — decide whether admin is in scope for launch; the dashboard has no admin surface |
| 3 | Public merchant storefront and checkout | `client/src/pages/PublicProvider.tsx`, `Checkout.tsx` | **Yes** — root `storefront.html` reads localStorage and cannot take a real booking |
| 4 | Merchant subdomain routing | `client/src/lib/subdomain.ts`, `SubdomainRouter` in `App.tsx` | **Yes** — needed for `merchant.vela.ng` |
| 5 | Typed domain model (User, Service, Booking, Schedule, Transaction, stats) | `client/src/types/index.ts` (206 lines) | **Yes** — port as the API DTO source of truth |
| 6 | Pages the dashboard lacks: calendar day view, staff, invoices, quotes/sales, discounts, financial, custom domains, reviews, portfolio editor | `client/src/pages/*.tsx` | **Decide** — some are represented inside dashboard sections; confirm which are launch features |
| 7 | SPA deployment config and headers | `client/vercel.json` | **Decide** — the root app needs its own hosting/headers plan before `client/` goes |
| 8 | Marketing/legal pages | `client/src/pages/marketing/*`, `client/src/pages/legal/*` | No — root HTML already covers these |

---

## 8. Open questions for the frontend owner

1. Is the admin portal part of this launch? If not, it can be parked with `client/`
   and rebuilt later.
2. Who ports the real login/register/OTP screens to the root app, and when? The
   backend can ship the endpoints before the UI exists.
3. The dashboard stores everything in `localStorage`; after the API lands, should
   it keep a local cache, or read only from the API?
4. Is the public booking page `storefront.html` (root) the one to ship, or the
   React `PublicProvider`/`Checkout` flow?
5. Confirm `merchant.vela.ng` subdomain routing is required at launch.
