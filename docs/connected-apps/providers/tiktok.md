# TikTok for Business Integration Setup Sheet

- **Official Documentation**: https://business-api.tiktok.com/portal/docs
- **Integration Type**: OAuth 2.0 (TikTok for Business Login)
- **Primary Use Case**: Barber and salon owners tracking viral video inquiries and ad conversions.

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `TIKTOK_APP_ID` | App ID | TikTok for Business Developer Portal | Server environment |
| `TIKTOK_SECRET` | Secret | TikTok for Business Developer Portal | Server encrypted environment |
| `TIKTOK_ACCESS_TOKEN` | Access Token | OAuth 2.0 Callback Exchange | Encrypted Merchant DB record |
| `TIKTOK_ADVERTISER_ID` | Advertiser ID | TikTok Ads Manager | Merchant DB record |
| `TIKTOK_PIXEL_CODE` | Web Pixel Code | TikTok Events Manager | Merchant DB record |

## 2. OAuth Scopes & Redirect URI
- **Redirect URI**: `https://[YOUR_DOMAIN]/api/auth/tiktok/callback`
- **Required Scopes**:
  - `leads`: Fetch instant form submissions directly into Vela decision queue.
  - `pixel`: Fire server-side events when appointment deposit is collected.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **TikTok for Business** → Taps **Connect with TikTok**.
2. Grants permissions to advertiser account and lead sync.
3. Maps lead form questions to Vela customer intake.
4. Finishes with **Send test lead to Vela**.
