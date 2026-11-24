# Microsoft Outlook Calendar Setup Sheet

- **Official Documentation**: https://learn.microsoft.com/en-us/graph/api/resources/calendar
- **Integration Type**: OAuth 2.0 (Microsoft Graph REST API)
- **Identity Provider**: Microsoft Entra ID (Azure AD) / Microsoft Account

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `MICROSOFT_CLIENT_ID` | Application (client) ID | Azure Portal → App Registrations | Server environment |
| `MICROSOFT_CLIENT_SECRET` | Client Secret Value | Azure Portal → Certificates & Secrets | Server encrypted environment |
| `MS_REFRESH_TOKEN` | OAuth Refresh Token | OAuth 2.0 Callback Exchange | Encrypted Merchant DB record |
| `MS_CALENDAR_ID` | Selected Calendar ID | Graph API `/me/calendars` | Merchant DB record |

## 2. OAuth Scopes & Redirect URI
- **Redirect URI**: `https://[YOUR_DOMAIN]/api/auth/microsoft/callback`
- **Required Scopes**:
  - `Calendars.ReadWrite`: Create, update, and delete booking events.
  - `User.Read`: Retrieve merchant's primary email address.
  - `offline_access`: Enable token refreshing in background sync.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Microsoft Outlook Calendar** → Taps **Connect with Microsoft**.
2. Completes Microsoft 365 / Outlook login and consents to calendar permissions.
3. Selects primary business calendar or staff schedule.
4. Finishes with **Schedule test booking**.
