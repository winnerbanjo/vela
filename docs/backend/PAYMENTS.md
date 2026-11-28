# Vela Payments — PRD Comparison and Settlement Design

**Status:** Day 4.5 (27 Nov 2026) · **PRD:** [VELA_PRD.md](../../VELA_PRD.md) §7 and §9
**Security standard:** [SECURITY.md](./SECURITY.md) §0.2, §0.3, §0.7

This note answers two questions before Day 5 builds quotes and invoices: what the
PRD asks of payments, and what the API actually does today.

---

## 1. Settlement: platform and direct

Vela supports both settlement paths the business needs.

| Mode | Who owns the Paystack account | Where money lands | When to use |
| --- | --- | --- | --- |
| `platform` (default) | Vela | Vela's Paystack balance, split to the merchant's verified subaccount | Vela collects on the merchant's behalf, handles checkout, and pays out automatically |
| `direct` | The merchant | The merchant's own Paystack balance | The merchant already has Paystack and wants the money to never touch Vela |

**Platform mode.** The merchant verifies a Nigerian bank account through Paystack
(`/bank/resolve`), Vela creates a subaccount with `percentage_charge: 0`, and
every checkout passes `subaccount` + `bearer: "subaccount"`. Paystack settles the
merchant's share and deducts its fee from that share. Vela takes no commission
today; a platform fee is a commercial decision that belongs in configuration,
not in code, when it is agreed.

**Direct mode.** The merchant pastes a Paystack secret key. Vela first verifies it
against Paystack (`GET /balance`) outside sandbox, then seals it with AES-256-GCM.
Checkout, refunds, and webhook verification use that key. The key and full account
number are never returned by the API, never logged, and never written to an audit
row. Only `last4` and a SHA-256 fingerprint are stored in the clear.

**Bank transfer.** Paystack Checkout already offers bank transfer, card, USSD, and
other enabled channels for whichever account is being charged. Vela does not need
a separate bank-transfer integration for checkout. The bank account a merchant
connects under Payments is the *settlement destination*, not a payment channel.
An offline transfer reported by a customer is a manual verification task (PRD
line 169), planned with the invoice/job work on Day 5.

---

## 2. PRD §7 — quotations, invoices, payments

| PRD requirement | Today | Gap / owner |
| --- | --- | --- |
| Quotation `Draft → Sent → Accepted / Declined / Expired / Superseded` | Not built | Day 5, M8 |
| Unique sequential invoice number, line items, total, amount received, deposit due, balance, Paystack link | Not built. `payments` stores the deposit actually charged and its checkout URL | Day 5, M8 |
| Integer minor units (kobo) | Done — `BIGINT` kobo everywhere; client totals rejected | — |
| Webhook deduplication by event ID | Done — unique `payment_events.event_id`, one booking and one ledger row per delivery | — |
| Payment after hold expiry: record money, recheck, flag paid-but-unscheduled | Done — payment stays `succeeded`, `failure_reason = paid_but_unscheduled`, audit exception | — |
| Refunds assigned to authorised humans | Done — owner role **and** password step-up, full refund, negative ledger row | — |
| Bank changes assigned to authorised humans | Done — owner role + password step-up + audit; contract and account are verified with Paystack before storing | — |
| Payment destination configuration | Done — platform subaccount or direct merchant key, with a single `GET /payments/settings` read model | — |
| Receipt generation | Not built | Day 5, Resend |
| Disputes | Out of scope for the one-week build; refunds + audit are the manual path | Operations |

## 3. PRD §9 — Paystack interface proof

| Interface Vela owns | Where it lives | Proof |
| --- | --- | --- |
| Payment intent creation | `POST /api/payments/initialize` from a live hold; amount and currency from the database | Integration: client cannot smuggle an amount; direct and platform both initialize |
| Webhook verification | Raw-body HMAC-SHA512 in constant time; platform or merchant key by pinned `settlement_mode` | Unit signature tests + integration forged `401` |
| Duplicate webhooks | Unique provider event id before any side effect | Integration: three deliveries → one booking, one ledger row |
| Delayed success | Pending payment + hold recheck; expired hold becomes `paid_but_unscheduled` | Integration |
| Mismatch recovery | Amount/currency mismatch flags the payment and audits the difference without booking | Integration |
| Receipt generation | Not built | Day 5 |

---

## 4. API surface

| Area | Routes |
| --- | --- |
| Public | `POST /api/payments/initialize` |
| Staff | `GET /api/payments`, `GET /api/payments/:reference`, `GET /api/payments/ledger/entries`, `GET /api/payments/settings`, `GET /api/payments/banks` |
| Owner + password | `POST /api/payments/:id/refund`, `PUT /api/payments/settings`, `DELETE /api/payments/settings`, `POST /api/payments/payout-account`, `DELETE /api/payments/payout-account` |
| Provider | `POST /api/webhooks/paystack` |

`PUT /payments/settings` accepts `{ mode, secretKey?, password }`. A secret key is
only accepted in `direct` mode. `POST /payments/payout-account` accepts
`{ bankCode, accountNumber, password }`; it lists banks, rejects unknown codes,
resolves the account name, creates the subaccount in platform mode, and stores the
account number sealed.

---

## 5. Security controls

- **Tenant from the session.** `merchant_id` is never read from a request body;
  strict Zod schemas reject unknown keys.
- **Least privilege.** Credentials and bank changes are owner-only and require the
  owner's password again. Staff can read settings and bank lists, never secrets.
- **Encryption at rest.** AES-256-GCM, random 96-bit IV, versioned payload. The KEK
  is `PAYMENT_ENCRYPTION_KEY` (32 bytes, base64) and is mandatory in production.
  Local dev derives a development key from `JWT_SECRET`; that fallback is
  unreachable in production.
- **Webhook trust.** Nothing is written until a signature verifies. A direct-mode
  delivery is only attempted after the reference resolves to a stored payment, so
  an unauthenticated request cannot cause key decryption (or a database write)
  for arbitrary input.
- **Pinned settlement.** `payments.settlement_mode` is written at initialize time.
  A later switch to platform mode cannot make Vela refund a direct charge from the
  platform account.
- **Audit.** `payment.settings.updated`, `payment.settings.disconnected`,
  `payment.payout_account.updated`, and `payment.payout_account.removed` record
  actor, before/after (masked), IP, user agent, and request id.

---

## 6. Known limits and go-live checklist

1. **Live Paystack is still untested** — no real keys have been supplied. Sandbox
   fixtures cover the state machine, but the first live check must be: connect a
   test-mode merchant key, verify a bank account, initialize one charge, replay a
   real webhook, refund it.
2. **Key rotation.** A direct refund uses the currently connected key. If the
   merchant rotates the key in Paystack before a refund, refund from the Paystack
   dashboard and reconnect Vela. Retaining old keys per payment is deliberately
   not done; it would widen the credential blast radius.
3. **Subaccount changes.** Changing the payout bank creates a new Paystack
   subaccount; the old one remains in Paystack but is no longer referenced. A
   reconciliation job can archive orphaned subaccounts later.
4. **Direct-mode bank account is informational.** Settlement is controlled by the
   merchant's Paystack dashboard. Vela records and verifies it for the dashboard,
   but does not move money in direct mode.
5. **Production environment.** Set `PAYSTACK_SECRET_KEY`,
   `PAYMENT_ENCRYPTION_KEY` (`openssl rand -base64 32`), and register
   `https://<api-host>/api/webhooks/paystack` in **both** the platform and each
   direct merchant's Paystack dashboard.
6. **Commission.** `percentage_charge` is `0`. Do not encode a platform fee until
   pricing is agreed and covered by a test.
