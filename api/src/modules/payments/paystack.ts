import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Paystack adapter.
 *
 * Three modes:
 *  - `live`: a secret key is configured; every call goes to the API.
 *  - `sandbox`: no key outside production; calls return deterministic fixtures
 *    so the whole flow (initialize → signed webhook → refund) can be tested.
 *  - `disabled`: production without a key; money routes fail closed with 501.
 *
 * Nothing here trusts the client: amounts are kobo integers computed from the
 * service, and only the HMAC-verified webhook can mark a payment succeeded.
 */

export const SANDBOX_SECRET_KEY = 'sk_test_vela_sandbox_only';
export const PAYSTACK_TIMEOUT_MS = 10_000;

export type PaystackMode = 'live' | 'sandbox' | 'disabled';

export interface PaystackConfig {
  readonly mode: PaystackMode;
  readonly secretKey: string | null;
  readonly apiBase: string;
  readonly timeoutMs?: number;
}

export class PaystackError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean, options: { cause?: unknown } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'PaystackError';
    this.retryable = retryable;
  }
}

export function webhookSecret(config: PaystackConfig): string {
  return config.mode === 'live' && config.secretKey ? config.secretKey : SANDBOX_SECRET_KEY;
}

export function signWebhookPayload(rawBody: Buffer | string, secret: string): string {
  return createHmac('sha512', secret).update(rawBody).digest('hex');
}

/**
 * Constant-time comparison of the `x-paystack-signature` header. A missing or
 * non-hex signature is a failure, never an empty-string match.
 */
export function verifyWebhookSignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !/^[0-9a-f]+$/i.test(signature)) return false;

  const expected = Buffer.from(signWebhookPayload(rawBody, secret), 'hex');
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, 'hex');
  } catch {
    return false;
  }
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/** Webhook deliveries have no event id header; the transaction id is stable. */
export function eventIdFor(type: string, dataId: unknown, rawBody: Buffer | string): string {
  if (typeof dataId === 'string' || typeof dataId === 'number') {
    return `${type}:${String(dataId)}`;
  }
  return `${type}:sha256:${createHash('sha256').update(rawBody).digest('hex')}`;
}

export interface InitializeInput {
  readonly email: string;
  readonly amountKobo: number;
  readonly reference: string;
  readonly currency: string;
  readonly callbackUrl?: string;
  readonly metadata?: Record<string, string>;
}

export interface InitializeResult {
  readonly authorizationUrl: string;
  readonly providerReference: string;
}

export interface RefundResult {
  readonly providerReference: string;
}

export interface PaystackClient {
  initialize(input: InitializeInput): Promise<InitializeResult>;
  refund(input: { providerReference: string; amountKobo?: number }): Promise<RefundResult>;
}

interface PaystackEnvelope {
  status?: boolean;
  message?: string;
  data?: {
    authorization_url?: string;
    reference?: string;
    id?: number | string;
  };
}

async function call(
  config: PaystackConfig,
  path: string,
  body: Record<string, unknown>,
): Promise<PaystackEnvelope> {
  if (config.mode !== 'live' || !config.secretKey) {
    throw new PaystackError('Paystack is not configured', false);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? PAYSTACK_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.apiBase}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const parsed = (await response.json().catch(() => ({}))) as PaystackEnvelope;

    if (!response.ok || parsed.status !== true) {
      // 5xx and 429 are worth retrying; a 400 is our bug and must not loop.
      const retryable = response.status >= 500 || response.status === 429;
      throw new PaystackError(
        `Paystack rejected ${path} (${response.status}): ${parsed.message ?? 'no message'}`,
        retryable,
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof PaystackError) throw error;
    // Network failure or timeout: the caller may retry, the money has not moved.
    throw new PaystackError(
      `Paystack ${path} did not complete`,
      true,
      error instanceof Error ? { cause: error } : {},
    );
  } finally {
    clearTimeout(timer);
  }
}

export function createPaystackClient(config: PaystackConfig): PaystackClient {
  return {
    async initialize(input) {
      if (config.mode === 'sandbox') {
        return {
          authorizationUrl: `https://sandbox.paystack.test/checkout/${encodeURIComponent(input.reference)}`,
          providerReference: `sandbox_${input.reference}`,
        };
      }

      const envelope = await call(config, '/transaction/initialize', {
        email: input.email,
        amount: input.amountKobo,
        reference: input.reference,
        currency: input.currency,
        ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      });

      const url = envelope.data?.authorization_url;
      const reference = envelope.data?.reference ?? input.reference;
      if (!url) {
        throw new PaystackError('Paystack returned no authorization URL', false);
      }
      return { authorizationUrl: url, providerReference: reference };
    },

    async refund(input) {
      if (config.mode === 'sandbox') {
        return { providerReference: `sandbox_refund_${input.providerReference}` };
      }

      const envelope = await call(config, '/refund', {
        transaction: input.providerReference,
        ...(input.amountKobo === undefined ? {} : { amount: input.amountKobo }),
      });

      return { providerReference: String(envelope.data?.id ?? 'refund') };
    },
  };
}
