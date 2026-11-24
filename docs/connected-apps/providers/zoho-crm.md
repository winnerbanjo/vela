# Zoho CRM Integration Setup Sheet

- **Official Documentation**: https://www.zoho.com/crm/developer/docs/api/v3/
- **Integration Type**: OAuth 2.0 (Authorization Code Grant)
- **Supported Modules**: Leads, Contacts, Deals, Notes

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `ZOHO_CLIENT_ID` | Client ID (`1000....`) | Zoho Developer Console | Server environment |
| `ZOHO_CLIENT_SECRET` | Client Secret | Zoho Developer Console | Server encrypted environment |
| `ZOHO_CRM_REFRESH_TOKEN` | OAuth Refresh Token | OAuth 2.0 Callback Exchange | Encrypted Merchant DB record |

## 2. OAuth Scopes & Redirect URI
- **Redirect URI**: `https://[YOUR_DOMAIN]/api/auth/zoho/callback`
- **Required Scopes**:
  - `ZohoCRM.modules.contacts.ALL`: Sync customer profiles and appointment histories.
  - `ZohoCRM.modules.deals.ALL`: Track high-value quotes and bookings.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Zoho CRM** → Taps **Connect with Zoho**.
2. Grants permissions to contacts and deals modules.
3. Maps customer fields (Full Name, Phone, Email, VIP status).
4. Verifies sync with test contact creation.
