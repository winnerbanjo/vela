# Vela Connected Apps — Developer & Platform Administrator Setup Guide

This guide describes how to configure, verify, and operate external service integrations for the Vela Merchant Platform.

---

## 1. Quick-Start Architecture

Vela cleanly separates **Platform Administration** (configured once by the Vela engineering team) from **Merchant Onboarding** (configured by individual service owners like barbers, salons, and photographers).

```
┌─────────────────────────────────────────────────────────────┐
│                      VELA PLATFORM                          │
│  - Environment Secrets (Platform Client IDs, App Secrets)   │
│  - Public Domain & Webhook Routers (/api/webhooks/*)        │
│  - Idempotent Event Deduplicator & Payment Ledger           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
    OAuth Authorization / API Keys     Verified Webhook Events
               │                              │
┌──────────────▼──────────────┐┌──────────────▼───────────────┐
│       MERCHANT OWNER        ││      EXTERNAL PROVIDERS      │
│  - Selects App in /#apps    ││  - Paystack, Flutterwave     │
│  - Authorizes Business Acct ││  - Google / Apple / Outlook  │
│  - Maps Staff Calendars     ││  - Zoho Mail / Books / CRM   │
│  - Sets NGN Deposit Rules   ││  - WhatsApp Business / Meta  │
└─────────────────────────────┘└──────────────────────────────┘
```

---

## 2. Local Development Tunnel Setup

External providers (such as Paystack, Flutterwave, and Meta) cannot deliver webhook events or OAuth redirects to `http://localhost:3030`.

### Using ngrok or Cloudflare Tunnels:
```bash
# Option A: ngrok
ngrok http 3030

# Option B: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3030
```

Copy the generated HTTPS URL (e.g., `https://vela-tunnel.ngrok-free.app`) and configure it in your `.env`:
```env
VELA_PUBLIC_URL=https://vela-tunnel.ngrok-free.app
```

---

## 3. Platform Diagnostics API

You can verify whether your server environment contains all required platform credentials without exposing secret values:

```bash
curl -s http://localhost:3030/api/admin/diagnostics | jq
```

Sample output:
```json
{
  "status": "operational",
  "environment": "development",
  "publicUrl": "http://localhost:3030",
  "providers": {
    "paystack": { "status": "configured", "mode": "sandbox", "missing": [] },
    "whatsapp": { "status": "configured", "webhookEndpoint": "/api/webhooks/whatsapp" },
    "google-calendar": { "status": "configured", "oauthCallback": "/api/oauth/callback/google" }
  }
}
```

---

## 4. Webhook Registration Directory

Every provider webhook route is hosted and verified on the server:

| Provider | Method | Webhook Endpoint | Signature Header / Verification | Subscribed Events |
| :--- | :---: | :--- | :--- | :--- |
| **Paystack** | `POST` | `/api/webhooks/paystack` | `x-paystack-signature` (HMAC SHA512) | `charge.success`, `transfer.success` |
| **Flutterwave** | `POST` | `/api/webhooks/flutterwave` | `verif-hash` header | `charge.completed` |
| **Stripe** | `POST` | `/api/webhooks/stripe` | `stripe-signature` (HMAC SHA256) | `checkout.session.completed`, `payment_intent.succeeded` |
| **WhatsApp Business** | `POST` / `GET` | `/api/webhooks/whatsapp` | `X-Hub-Signature-256` & `hub.challenge` | `messages`, `message_deliveries` |
| **Zoho Suite** | `POST` | `/api/webhooks/zoho` | Zoho OAuth Bearer Token | `invoice.payment_recorded`, `mail.inbound` |

---

## 5. Event Deduplication & Unified Ledger

- **Idempotency**: All incoming webhooks are validated by their unique event ID (`data.id`, `event.id`, or message ID). If an event is re-delivered, Vela returns `HTTP 200 { deduplicated: true }` without creating duplicate receipts, bookings, or ledger entries.
- **Provider-Locked References**: Checkout sessions lock the issuing gateway (`VP-...`, `FLW-...`, `cs_test_...`). Switching the merchant default payment gateway preserves older pending transactions and routes settlement to their original bank account.
- **Unified Balance Ledger**: Money received immediately credits against the total service cost across Money, Bookings, Clients, and the AI Agent.
