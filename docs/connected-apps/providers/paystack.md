# Paystack Integration Setup Sheet

- **Official Documentation**: https://paystack.com/docs/api/
- **Integration Type**: API Keys + Webhooks (or Paystack Merchant Connect)
- **Supported Countries**: Nigeria, Ghana, South Africa, Kenya
- **Currency Supported**: NGN (Primary), GHS, ZAR, KES, USD (domiciliary accounts)

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `PAYSTACK_LIVE_SECRET_KEY` | Live Secret Key (`sk_live_...`) | Paystack Dashboard → Settings → API Keys & Webhooks | Server encrypted environment |
| `PAYSTACK_LIVE_PUBLIC_KEY` | Live Public Key (`pk_live_...`) | Paystack Dashboard → Settings → API Keys & Webhooks | Server environment |
| `PAYSTACK_WEBHOOK_SECRET` | Secret Key used for HMAC SHA512 signature | Same as Secret Key | Server environment |

## 2. Webhook Registration
- **Webhook URL**: `https://[YOUR_DOMAIN]/api/webhooks/paystack`
- **Subscribed Events**:
  - `charge.success`: Triggered when client completes deposit payment on checkout.
  - `transfer.success`: Triggered when deposit is settled to merchant bank account.
- **Verification Method**: Validate `req.headers['x-paystack-signature']` using `crypto.createHmac('sha512', secret).update(rawBody).digest('hex')`.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Paystack** → Taps **Connect account**.
2. Selects **Live Mode** or **Test Mode**.
3. Pastes Secret Key and Public Key (validated on server; masked as `sk_live_••••••••4910`).
4. Selects whether Paystack handles default NGN booking deposits.
5. Verifies webhook connection with **Check for test event**.
6. Finishes with **Preview deposit checkout**.

## 4. Reproducible Test
```bash
curl -X POST http://localhost:3030/api/webhooks/test-trigger \
  -H "Content-Type: application/json" \
  -d '{"provider":"paystack","amount":2000,"reference":"VP-PAY-88221"}'
```
Expected result: `HTTP 200 { success: true, verified: true, customerPaymentStatus: "Paid", bankSettlementStatus: "Settled to GTBank (...4910)" }`.
