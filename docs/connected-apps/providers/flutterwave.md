# Flutterwave Integration Setup Sheet

- **Official Documentation**: https://developer.flutterwave.com/docs
- **Integration Type**: API Keys + Webhook Secret Hash
- **Supported Countries**: Nigeria, Ghana, Kenya, South Africa, Rwanda, Uganda, UK, Europe, USA
- **Currencies Supported**: NGN, USD, GBP, EUR, GHS, KES, ZAR, RWF, UGX

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `FLUTTERWAVE_SECRET_KEY` | Secret Key (`FLWSECK_LIVE-...` or `FLWSECK_TEST-...`) | Flutterwave Dashboard → Settings → API Keys | Server encrypted environment |
| `FLUTTERWAVE_PUBLIC_KEY` | Public Key (`FLWPUBK_LIVE-...` or `FLWPUBK_TEST-...`) | Flutterwave Dashboard → Settings → API Keys | Server environment |
| `FLUTTERWAVE_ENCRYPTION_KEY`| Encryption Key | Flutterwave Dashboard → Settings → API Keys | Server encrypted environment |
| `FLUTTERWAVE_SECRET_HASH` | Webhook Secret Hash | Flutterwave Dashboard → Settings → Webhooks | Server environment |

## 2. Webhook Registration
- **Webhook URL**: `https://[YOUR_DOMAIN]/api/webhooks/flutterwave`
- **Secret Hash**: Defined in dashboard and verified against header.
- **Subscribed Events**:
  - `charge.completed`: Triggered when card, USSD, bank transfer or mobile money deposit completes.
  - `transfer.completed`: Payout to merchant settled.
- **Verification Method**: Compare `req.headers['verif-hash']` directly to `process.env.FLUTTERWAVE_SECRET_HASH`.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Flutterwave** → Taps **Connect account**.
2. Selects **Live Mode** or **Test Mode**.
3. Pastes Secret Key, Public Key, and Secret Hash (validated on server; masked as `FLWSECK_LIVE-••••••••3821`).
4. Selects whether Flutterwave handles multi-currency cards & international deposits.
5. Verifies webhook connection with **Check for test event**.
6. Finishes with **Preview deposit checkout**.

## 4. Reproducible Test
```bash
curl -X POST http://localhost:3030/api/webhooks/test-trigger \
  -H "Content-Type: application/json" \
  -d '{"provider":"flutterwave","amount":5000,"reference":"FLW-REF-99120"}'
```
Expected result: `HTTP 200 { success: true, verified: true, customerPaymentStatus: "Paid" }`.
