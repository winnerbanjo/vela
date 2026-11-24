# Dropbox Integration Setup Sheet

- **Official Documentation**: https://www.dropbox.com/developers/documentation
- **Integration Type**: OAuth 2.0 (PKCE / Web Flow)
- **Primary Use Case**: Photographers and videographers delivering high-res photo assets.

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `DROPBOX_APP_KEY` | App Key | Dropbox App Console (`dropbox.com/developers/apps`) | Server environment |
| `DROPBOX_APP_SECRET` | App Secret | Dropbox App Console | Server encrypted environment |
| `DROPBOX_REFRESH_TOKEN` | OAuth Refresh Token | OAuth 2.0 Callback Exchange | Encrypted Merchant DB record |
| `DROPBOX_FOLDER_PATH` | Deliverables Root Path | Chosen in UI (e.g., `/Client Shoots`) | Merchant DB record |

## 2. OAuth Scopes & Redirect URI
- **Redirect URI**: `https://[YOUR_DOMAIN]/api/auth/dropbox/callback`
- **Required Scopes**:
  - `files.content.write`: Create shoot delivery folders and upload proof sets.
  - `files.content.read`: Check shoot deliverables status.
  - `sharing.write`: Generate password-protected or view-only client links.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Dropbox** → Taps **Connect account**.
2. Authorizes Dropbox permissions.
3. Chooses client deliverables destination folder.
4. Finishes with **Create test deliverable folder**.
