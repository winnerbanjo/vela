# Meta Ads Integration Setup Sheet

- **Official Documentation**: https://developers.facebook.com/docs/marketing-apis/
- **Integration Type**: OAuth 2.0 (Facebook Login for Business)
- **Primary Use Case**: Barber and salon owners tracking lead campaigns and booking conversions.

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `META_APP_ID` | App ID | Meta Developers (`developers.facebook.com`) | Server environment |
| `META_APP_SECRET` | App Secret | Meta Developers → App Settings → Basic | Server encrypted environment |
| `META_SYSTEM_USER_TOKEN`| System User Access Token | Meta Business Manager → System Users | Encrypted Merchant DB record |
| `META_AD_ACCOUNT_ID` | Ad Account ID (`act_...`) | Meta Ads Manager | Merchant DB record |
| `META_PIXEL_ID` | Meta Pixel / Dataset ID | Meta Events Manager | Merchant DB record |

## 2. OAuth Scopes & Redirect URI
- **Redirect URI**: `https://[YOUR_DOMAIN]/api/auth/meta/callback`
- **Required Scopes**:
  - `ads_management`: Monitor lead campaigns and campaign spend.
  - `leads_retrieval`: Ingest instant lead forms into Vela Agent inbox.
  - `business_management`: Read connected pages and ad accounts.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Meta Ads** → Taps **Connect with Meta**.
2. Selects Business Portfolio and Ad Account.
3. Selects Conversion Pixel to report completed booking deposits.
4. Finishes with **Send test conversion event**.
