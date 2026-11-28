import { describe, expect, it } from 'vitest';
import {
  createPaystackClient,
  eventIdFor,
  PaystackError,
  SANDBOX_SECRET_KEY,
  signWebhookPayload,
  verifyWebhookSignature,
} from '../../src/modules/payments/paystack.js';

const config = {
  mode: 'sandbox' as const,
  secretKey: null,
  apiBase: 'https://api.paystack.co',
};

describe('paystack webhook signatures', () => {
  const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: { id: 1 } }));

  it('accepts the signature the provider would send', () => {
    const signature = signWebhookPayload(body, SANDBOX_SECRET_KEY);
    expect(verifyWebhookSignature(body, signature, SANDBOX_SECRET_KEY)).toBe(true);
  });

  it('rejects a tampered body, a wrong secret, and a missing signature', () => {
    const signature = signWebhookPayload(body, SANDBOX_SECRET_KEY);

    expect(
      verifyWebhookSignature(
        Buffer.from('{"event":"charge.success"}'),
        signature,
        SANDBOX_SECRET_KEY,
      ),
    ).toBe(false);
    expect(verifyWebhookSignature(body, signature, 'another-secret')).toBe(false);
    expect(verifyWebhookSignature(body, undefined, SANDBOX_SECRET_KEY)).toBe(false);
  });

  it('rejects malformed and empty signatures without throwing', () => {
    expect(verifyWebhookSignature(body, '', SANDBOX_SECRET_KEY)).toBe(false);
    expect(verifyWebhookSignature(body, 'not-hex', SANDBOX_SECRET_KEY)).toBe(false);
    expect(verifyWebhookSignature(body, 'ab', SANDBOX_SECRET_KEY)).toBe(false);
  });

  it('includes a colon-free event id that is stable across retries', () => {
    expect(eventIdFor('charge.success', 42, body)).toBe('charge.success:42');
    expect(eventIdFor('charge.success', 42, body)).toBe(eventIdFor('charge.success', 42, body));

    const hashed = eventIdFor('charge.success', undefined, body);
    expect(hashed).toMatch(/^charge\.success:sha256:[0-9a-f]{64}$/);
    expect(hashed).not.toBe(eventIdFor('charge.success', undefined, Buffer.from('{}')));
  });
});

describe('paystack sandbox client', () => {
  it('returns a deterministic checkout URL instead of calling out', async () => {
    const client = createPaystackClient(config);
    const initialized = await client.initialize({
      email: 'amaka@example.com',
      amountKobo: 200_000,
      reference: 'VELA-TEST',
      currency: 'NGN',
    });

    expect(initialized.authorizationUrl).toBe('https://sandbox.paystack.test/checkout/VELA-TEST');
    expect(initialized.providerReference).toBe('sandbox_VELA-TEST');

    await expect(
      client.refund({ providerReference: 'sandbox_VELA-TEST', amountKobo: 200_000 }),
    ).resolves.toEqual({ providerReference: 'sandbox_refund_sandbox_VELA-TEST' });
  });

  it('refuses to pretend when payments are disabled', async () => {
    const client = createPaystackClient({ ...config, mode: 'disabled' });

    await expect(
      client.initialize({
        email: 'amaka@example.com',
        amountKobo: 200_000,
        reference: 'VELA-TEST',
        currency: 'NGN',
      }),
    ).rejects.toBeInstanceOf(PaystackError);
  });

  it('never calls the network in live mode without a key', async () => {
    const client = createPaystackClient({ ...config, mode: 'live', secretKey: null });

    await expect(
      client.initialize({
        email: 'amaka@example.com',
        amountKobo: 200_000,
        reference: 'VELA-TEST',
        currency: 'NGN',
      }),
    ).rejects.toThrow(/not configured/);
  });
});
