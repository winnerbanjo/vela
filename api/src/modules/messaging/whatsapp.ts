import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../../platform/config.js';
import { ConflictError, NotImplementedError } from '../../platform/errors.js';

/**
 * WhatsApp Cloud API adapter.
 *
 * Three modes, mirroring payments: `live` when the platform token, phone number
 * id, and app secret are configured; `sandbox` outside production (deterministic
 * ids, no network); `disabled` in production without credentials. Nothing here
 * logs a token or an app secret.
 */

export interface WhatsAppClient {
  readonly mode: 'live' | 'sandbox' | 'disabled';
  sendText(input: { to: string; body: string }): Promise<{ providerMessageId: string }>;
}

export interface InboundMessage {
  readonly providerMessageId: string;
  readonly waId: string;
  readonly clientName: string | null;
  readonly body: string;
  readonly phoneNumberId: string | null;
}

export const QUIET_START_HOUR = 21;
export const QUIET_END_HOUR = 8;

/** Meta's required opt-out keywords, matched on the whole message. */
const OPT_OUT_KEYWORDS = new Set([
  'stop',
  'stop all',
  'unsubscribe',
  'cancel',
  'end',
  'quit',
  'opt out',
  'optout',
]);

export function normalizeWaId(value: string): string {
  return value.replace(/[^\d]/g, '').slice(0, 32);
}

export function isOptOut(body: string): boolean {
  const normalized = body
    .trim()
    .toLowerCase()
    .replace(/[.!]+$/g, '')
    .replace(/\s+/g, ' ');
  return OPT_OUT_KEYWORDS.has(normalized);
}

/** Local hour in a merchant timezone, without a date library. */
export function hourInZone(timeZone: string, at: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  })
    .formatToParts(at)
    .find((part) => part.type === 'hour')?.value;

  if (hour === undefined) throw new RangeError(`Could not resolve the hour in ${timeZone}`);
  return Number(hour) % 24;
}

/** No outbound campaigns at night, measured in the merchant's timezone. */
export function isQuietHours(timeZone: string, at: Date = new Date()): boolean {
  const hour = hourInZone(timeZone, at);
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/** Verifies `X-Hub-Signature-256: sha256=<hex>` against the exact raw bytes. */
export function verifyWhatsAppSignature(
  rawBody: Buffer,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const presented = header.slice('sha256='.length).trim();
  if (!/^[0-9a-f]{64}$/i.test(presented)) return false;

  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  const actual = Buffer.from(presented, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Reads the Cloud API webhook envelope into flat inbound messages. */
export function parseInboundWebhook(payload: unknown): InboundMessage[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const entries = (payload as { entry?: unknown }).entry;
  if (!Array.isArray(entries)) return [];

  const messages: InboundMessage[] = [];
  for (const entry of entries) {
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const value = (change as { value?: unknown }).value as
        | {
            metadata?: { phone_number_id?: unknown };
            contacts?: Array<{ profile?: { name?: unknown }; wa_id?: unknown }>;
            messages?: Array<{
              id?: unknown;
              from?: unknown;
              type?: unknown;
              text?: { body?: unknown };
              button?: { text?: unknown };
              interactive?: { button_reply?: { title?: unknown } };
            }>;
          }
        | undefined;
      if (!value || !Array.isArray(value.messages)) continue;

      const phoneNumberId =
        typeof value.metadata?.phone_number_id === 'string' ? value.metadata.phone_number_id : null;
      const name =
        typeof value.contacts?.[0]?.profile?.name === 'string'
          ? value.contacts[0].profile.name.slice(0, 120)
          : null;

      for (const message of value.messages) {
        if (typeof message.id !== 'string' || typeof message.from !== 'string') continue;
        const body =
          (typeof message.text?.body === 'string' && message.text.body) ||
          (typeof message.button?.text === 'string' && message.button.text) ||
          (typeof message.interactive?.button_reply?.title === 'string' &&
            message.interactive.button_reply.title) ||
          '';
        if (body.length === 0) continue;

        messages.push({
          providerMessageId: message.id.slice(0, 120),
          waId: normalizeWaId(message.from),
          clientName: name,
          body: body.slice(0, 4096),
          phoneNumberId,
        });
      }
    }
  }

  return messages;
}

function liveClient(config: AppConfig, token: string, phoneNumberId: string): WhatsAppClient {
  return {
    mode: 'live',
    async sendText({ to, body }) {
      const response = await fetch(`${config.whatsappApiBase}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body },
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        // The provider body can echo the recipient; keep the failure generic.
        throw new ConflictError('WhatsApp rejected the message; try again shortly');
      }

      const payload = (await response.json()) as {
        messages?: Array<{ id?: unknown }>;
      };
      const id = payload.messages?.[0]?.id;
      if (typeof id !== 'string') {
        throw new ConflictError('WhatsApp did not return a message id');
      }
      return { providerMessageId: id.slice(0, 120) };
    },
  };
}

export function whatsappClient(
  config: AppConfig,
  override?: { accessToken?: string | null; phoneNumberId?: string | null },
): WhatsAppClient {
  if (config.messagingMode === 'sandbox') {
    return {
      mode: 'sandbox',
      async sendText({ to }) {
        // Deterministic shape, no network, no real message.
        return {
          providerMessageId: `wamid.sandbox.${normalizeWaId(to)}.${randomUUID()}`.slice(0, 120),
        };
      },
    };
  }

  // A merchant-connected number takes precedence over the platform number.
  const token = override?.accessToken ?? config.whatsappAccessToken;
  const phoneNumberId = override?.phoneNumberId ?? config.whatsappPhoneNumberId;

  if (config.messagingMode === 'live' && token && phoneNumberId) {
    return liveClient(config, token, phoneNumberId);
  }

  return {
    mode: 'disabled',
    async sendText() {
      throw new NotImplementedError('WhatsApp is disabled until credentials are configured');
    },
  };
}
