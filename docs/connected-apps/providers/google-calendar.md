# Google Calendar Integration Setup Sheet

- **Official Documentation**: https://developers.google.com/calendar/api/v3/reference
- **Integration Type**: Google OAuth 2.0
- **Supported Scopes**:
  - `https://www.googleapis.com/auth/calendar.readonly`: Read free/busy slots.
  - `https://www.googleapis.com/auth/calendar.events`: Create/update confirmed appointments.

## 1. Platform Developer Registration
1. In **Google Cloud Console**, create project `Vela Platform Services`.
2. Enable **Google Calendar API**.
3. Configure OAuth Consent Screen (Application name: `Vela`, support email: `hello@vela.ng`).
4. Create OAuth 2.0 Client ID (Web Application):
   - **Authorized redirect URI**: `https://api.studioteni.ng/api/oauth/callback/google`
5. Set `GOOGLE_PLATFORM_CLIENT_ID` and `GOOGLE_PLATFORM_CLIENT_SECRET` in server environment.

## 2. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **Google Calendar** → Taps **Continue with Google**.
2. Authorizes access on Google login screen.
3. Chooses which calendar belongs to which staff member (e.g., *Dele · Chair 1 Schedule*).
4. Configures appointment buffer minutes (15 mins default for cleanup/sanitization).
5. Meaningful check: Vela runs a free/busy query, returning open and booked slots.
6. Finishes with **Check Dele's availability**.

## 3. Resilience & Failure Recovery
- If OAuth refresh token expires or is revoked, status changes to `needs_attention`.
- The merchant sees: *"Vela can read Dele's availability. Permission to add appointments has expired."*
- Any pending move or draft task is preserved and resumes immediately upon tapping **Reconnect**.
