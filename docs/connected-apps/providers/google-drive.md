# Google Drive Integration Setup Sheet

- **Official Documentation**: https://developers.google.com/drive/api/v3/about-sdk
- **Integration Type**: OAuth 2.0 (Google Identity Services)
- **Primary Use Case**: Photographers sharing photo shoot galleries, contracts, and proofs.

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | Client ID (`*.apps.googleusercontent.com`) | Google Cloud Console → APIs & Services → Credentials | Server environment |
| `GOOGLE_CLIENT_SECRET` | Client Secret | Google Cloud Console | Server encrypted environment |
| `GDRIVE_REFRESH_TOKEN` | OAuth Refresh Token | OAuth 2.0 Callback Exchange | Encrypted Merchant DB record |
| `GDRIVE_TARGET_FOLDER_ID`| Root Portfolio Folder ID | Google Drive UI / Folder Picker | Merchant DB record |

## 2. OAuth Scopes & Redirect URI
- **Redirect URI**: `https://[YOUR_DOMAIN]/api/auth/google/callback`
- **Required Scopes**:
  - `https://www.googleapis.com/auth/drive.file`: Per-file access to create and manage client gallery folders.
  - `offline_access`: Enable uploading photo shoot packages when merchant is offline.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Google Drive** → Taps **Connect with Google**.
2. Approves OAuth permissions for Google Drive storage.
3. Selects default folder destination (e.g., `Horizon Photography Deliverables`).
4. Finishes with **Upload test gallery link**.
