# Stripe Integration Setup Sheet

- **Official Documentation**: https://stripe.com/docs/api
- **Integration Type**: API Keys + Webhook Signatures or Stripe Connect Standard
- **Supported Countries**: 47+ countries (USA, UK, Canada, Australia, EU, etc.)
- **Currencies Supported**: 135+ currencies (USD, GBP, EUR, CAD, AUD, etc.)

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `STRIPE_SECRET_KEY` | Secret Key (`sk_live_...` or `sk_test_...`) | Stripe Dashboard → Developers → API keys | Server encrypted environment |
| `STRIPE_PUBLISHABLE_KEY` | Publishable Key (`pk_live_...` or `pk_test_...`) | Stripe Dashboard → Developers → API keys | Client / Server environment |
| `STRIPE_WEBHOOK_SECRET` | Signing secret (`whsec_...`) | Stripe Dashboard → Developers → Webhooks | Server environment |

## 2. Webhook Registration
- **Webhook URL**: `https://[YOUR_DOMAIN]/api/webhooks/stripe`
- **Subscribed Events**:
  - `payment_intent.succeeded`: Triggered when card/Apple Pay/Google Pay payment succeeds.
  - `checkout.session.completed`: Triggered when Stripe Hosted Checkout finishes.
  - `charge.refunded`: Triggered when refund is issued.
- **Verification Method**: Validate `req.headers['stripe-signature']` using `stripe.webhooks.constructEvent(payload, sig, endpointSecret)`.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Stripe** → Taps **Connect account**.
2. Selects **Live Mode** or **Test Mode**.
3. Pastes Secret Key, Publishable Key, and Webhook Signing Secret (`whsec_...`).
4. Selects default currency (USD, GBP, EUR).
5. Verifies webhook connection with **Check for test event**.
6. Finishes with **Send test payment link**.

## 4. Reproducible Test
```bash
curl -X POST http://localhost:3030/api/webhooks/test-trigger \
  -H "Content-Type: application/json" \
  -d '{"provider":"stripe","amount":5000,"reference":"pi_3MtwBwLkdIwHu7ix28a3tqPa"}'
```
Expected result: `HTTP 200 { success: true, verified: true, customerPaymentStatus: "Paid" }`.
