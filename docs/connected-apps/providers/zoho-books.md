# Zoho Books Integration Setup Sheet

- **Official Documentation**: https://www.zoho.com/books/api/v3/
- **Integration Type**: OAuth 2.0 (Authorization Code Grant)
- **Supported Regions**: US, EU, IN, AU, UK, CA, UAE, Global

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `ZOHO_CLIENT_ID` | Client ID (`1000....`) | Zoho Developer Console | Server environment |
| `ZOHO_CLIENT_SECRET` | Client Secret | Zoho Developer Console | Server encrypted environment |
| `ZOHO_BOOKS_ORG_ID` | Organization ID | Zoho Books → Settings → Profile | Merchant DB record |
| `ZOHO_BOOKS_REFRESH_TOKEN`| OAuth Refresh Token | OAuth 2.0 Callback Exchange | Encrypted Merchant DB record |

## 2. OAuth Scopes & Redirect URI
- **Redirect URI**: `https://[YOUR_DOMAIN]/api/auth/zoho/callback`
- **Required Scopes**:
  - `ZohoBooks.invoices.CREATE`: Automatically create invoices when quotes are approved.
  - `ZohoBooks.customerpayments.CREATE`: Post customer deposits as recorded payments.
  - `ZohoBooks.contacts.ALL`: Sync customer records.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Zoho Books** → Taps **Connect with Zoho**.
2. Approves OAuth permissions for invoicing and payment records.
3. Selects active Organization ID if multiple organizations exist.
4. Completes initial ledger sync check.
5. Finishes with **Create test invoice in Zoho Books**.

## 4. Failure Recovery & Retries
- When a customer pays a deposit via Paystack or Flutterwave, if Zoho Books returns HTTP 429 (rate limit) or 503, Vela logs state `Deposit received · Zoho Books sync pending`.
- Merchant or automated worker can trigger `POST /api/retry` with `action: 'sync_zoho_books'` to reconcile the journal entry without duplicating the customer payment receipt.
