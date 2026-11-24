# WhatsApp Business Platform Setup Sheet

- **Official Documentation**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **Integration Type**: Meta Cloud API / WhatsApp Business Platform
- **Authentication**: System User Permanent Token + Meta Webhook Verification

## 1. Platform Registration
1. In **Meta Developer Portal**, create business app with **WhatsApp** product.
2. Link verified Meta Business Manager (WABA).
3. Register Webhook:
   - **Callback URL**: `https://api.studioteni.ng/api/webhooks/whatsapp`
   - **Verify Token**: Configured in `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - **Subscribed Fields**: `messages`, `message_deliveries`
4. Signature Verification: `X-Hub-Signature-256` HMAC-SHA256 with App Secret.

## 2. Merchant Setup Flow in UI
1. Owner opens **Connected Apps** → Selects **WhatsApp Business**.
2. Selects verified studio business phone number (`+234 803 123 4567`).
3. Selects agent reply mode:
   - **Draft for me**: AI drafts replies for owner review before sending.
   - **Auto-reply routine**: Routine pricing/location queries sent automatically.
4. Pauses AI replies when owner takes over chat manually.
5. Verifies webhook connection with **Receive test enquiry**.
