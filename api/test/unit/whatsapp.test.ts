import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  hourInZone,
  isOptOut,
  isQuietHours,
  normalizeWaId,
  parseInboundWebhook,
  verifyWhatsAppSignature,
} from '../../src/modules/messaging/whatsapp.js';

describe('WhatsApp inbound security', () => {
  const secret = 'app-secret-for-tests';

  it('accepts a signature over the exact raw body', () => {
    const body = Buffer.from('{"entry":[]}');
    const digest = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWhatsAppSignature(body, `sha256=${digest}`, secret)).toBe(true);
  });

  it('rejects a tampered body, a wrong secret, and a malformed header', () => {
    const body = Buffer.from('{"entry":[]}');
    const digest = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWhatsAppSignature(Buffer.from('{"entry":[1]}'), `sha256=${digest}`, secret)).toBe(
      false,
    );
    expect(verifyWhatsAppSignature(body, `sha256=${digest}`, 'other-secret')).toBe(false);
    expect(verifyWhatsAppSignature(body, 'sha1=abc', secret)).toBe(false);
    expect(verifyWhatsAppSignature(body, undefined, secret)).toBe(false);
  });

  it('reads the Cloud API envelope into flat messages', () => {
    const messages = parseInboundWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'PNID-1' },
                contacts: [{ profile: { name: 'Ada Obi' }, wa_id: '2348012345678' }],
                messages: [{ id: 'wamid.1', from: '2348012345678', text: { body: 'Hi' } }],
              },
            },
          ],
        },
      ],
    });

    expect(messages).toEqual([
      {
        providerMessageId: 'wamid.1',
        waId: '2348012345678',
        clientName: 'Ada Obi',
        body: 'Hi',
        phoneNumberId: 'PNID-1',
      },
    ]);
  });

  it('ignores envelopes with no text messages', () => {
    expect(parseInboundWebhook(null)).toEqual([]);
    expect(parseInboundWebhook({ entry: [{ changes: [{ value: {} }] }] })).toEqual([]);
  });

  it('recognises opt-out keywords only as the whole message', () => {
    expect(isOptOut('STOP')).toBe(true);
    expect(isOptOut(' stop. ')).toBe(true);
    expect(isOptOut('Unsubscribe')).toBe(true);
    expect(isOptOut('cancel')).toBe(true);
    expect(isOptOut('please stop by tomorrow')).toBe(false);
    expect(isOptOut('Hi there')).toBe(false);
  });

  it('normalises a WhatsApp id to digits', () => {
    expect(normalizeWaId('+234 801-234-5678')).toBe('2348012345678');
  });
});

describe('quiet hours in the merchant timezone', () => {
  it('blocks 21:00 through 07:59 local and allows the working day', () => {
    expect(isQuietHours('Africa/Lagos', new Date('2026-11-28T20:30:00Z'))).toBe(true); // 21:30 local
    expect(isQuietHours('Africa/Lagos', new Date('2026-11-28T06:59:00Z'))).toBe(true); // 07:59 local
    expect(isQuietHours('Africa/Lagos', new Date('2026-11-28T07:00:00Z'))).toBe(false); // 08:00 local
    expect(isQuietHours('Africa/Lagos', new Date('2026-11-28T12:00:00Z'))).toBe(false); // 13:00 local
  });

  it('reads the hour in the tenant zone, not the server zone', () => {
    expect(hourInZone('Asia/Tokyo', new Date('2026-11-28T22:00:00Z'))).toBe(7);
    expect(hourInZone('UTC', new Date('2026-11-28T22:00:00Z'))).toBe(22);
  });
});
