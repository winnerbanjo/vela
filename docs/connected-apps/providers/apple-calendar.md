# Apple Calendar Integration Setup Sheet

- **Official Documentation**: RFC 4791 (CalDAV) / Apple ID App-Specific Passwords
- **Integration Type**: CalDAV over HTTPS (or Sign in with Apple + iCloud CalDAV)
- **Host**: `caldav.icloud.com:443`

## 1. Credentials Required
| Key | Provider Term | Origin | Where Stored |
| :--- | :--- | :--- | :--- |
| `APPLE_ID_EMAIL` | Apple Account Email | Apple ID (`appleid.apple.com`) | Merchant DB record |
| `APPLE_APP_SPECIFIC_PWD` | App-Specific Password (`xxxx-xxxx-xxxx-xxxx`) | Apple ID → Sign-In and Security → App-Specific Passwords | Server encrypted environment |
| `APPLE_CALENDAR_URL` | Selected CalDAV Principal / Collection URL | Discovered via CalDAV propfind | Merchant DB record |

## 2. Security Notes
- Apple does not provide public third-party OAuth for iCloud CalDAV; connections require an **App-Specific Password**.
- The UI provides clear instructions with a deep link to `appleid.apple.com`.
- Master Apple ID passwords must never be requested or accepted.

## 3. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Apple Calendar** → Taps **Connect account**.
2. Enters Apple ID email and 16-character App-Specific Password.
3. Server executes CalDAV `PROPFIND` discovery to verify credentials and list available calendars.
4. Merchant selects target calendar (e.g. "Work Appointments").
5. Finishes with **Schedule test booking**.
