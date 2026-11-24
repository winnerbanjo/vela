# Zoho Mail Integration Setup Sheet

- **Official Documentation**: https://www.zoho.com/mail/help/api/
- **Integration Type**: OAuth 2.0 (Authorization Code Grant)
- **Supported Regions**: US, EU, IN, AU, JP, CA (`accounts.zoho.com` / `.eu` / etc.)

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `ZOHO_CLIENT_ID` | Client ID (`1000....`) | Zoho Developer Console → Server-based Applications | Server environment |
| `ZOHO_CLIENT_SECRET` | Client Secret | Zoho Developer Console → Server-based Applications | Server encrypted environment |
| `ZOHO_REFRESH_TOKEN` | Refresh Token | OAuth 2.0 Callback Exchange | Encrypted Merchant DB record |
| `ZOHO_ACCOUNT_ID` | Account ID | Zoho Mail API `/api/accounts` | Merchant DB record |

## 2. OAuth Scopes & Redirect URI
- **Redirect URI**: `https://[YOUR_DOMAIN]/api/auth/zoho/callback`
- **Required Scopes**:
  - `ZohoMail.messages.ALL`: Read inquiries and send quotations/invoices.
  - `ZohoMail.accounts.READ`: Verify connected mailbox identity.
  - `offline_access`: Receive refresh tokens for offline sync.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Zoho Mail** → Taps **Connect with Zoho**.
2. Redirects to Zoho OAuth consent screen requesting access to business email.
3. Merchant approves permissions.
4. Server stores tokens and verifies mailbox address (e.g. `studio@horizonphoto.ng`).
5. Finishes with **Send test inquiry reply**.
