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

/** The platform webhook secret, or null when the platform account is off. */
export function webhookSecret(config: PaystackConfig): string | null {
  if (config.mode === 'live' && config.secretKey) return config.secretKey;
  if (config.mode === 'sandbox') return SANDBOX_SECRET_KEY;
  return null;
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

export interface Bank {
  readonly code: string;
  readonly name: string;
}

export interface InitializeInput {
  readonly email: string;
  readonly amountKobo: number;
  readonly reference: string;
  readonly currency: string;
  readonly callbackUrl?: string;
  readonly subaccountCode?: string;
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
  /** Confirms the key is accepted by Paystack before it is stored. */
  verifyCredentials(): Promise<void>;
  listBanks(): Promise<Bank[]>;
  resolveAccount(input: {
    bankCode: string;
    accountNumber: string;
  }): Promise<{ accountName: string }>;
  createSubaccount(input: {
    businessName: string;
    bankCode: string;
    accountNumber: string;
    percentageCharge: number;
  }): Promise<{ subaccountCode: string }>;
}

/** Deterministic fixtures so the non-network mode behaves like the real one. */
export const SANDBOX_BANKS: readonly Bank[] = [
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '50211', name: 'Kuda Microfinance Bank' },
];

interface PaystackEnvelope<T> {
  status?: boolean;
  message?: string;
  data?: T;
}

async function request<T>(
  config: PaystackConfig,
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  if (config.mode !== 'live' || !config.secretKey) {
    throw new PaystackError('Paystack is not configured', false);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? PAYSTACK_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });

    const parsed = (await response.json().catch(() => ({}))) as PaystackEnvelope<T>;

    if (!response.ok || parsed.status !== true) {
      // 5xx and 429 are worth retrying; a 400 is our bug and must not loop.
      const retryable = response.status >= 500 || response.status === 429;
      throw new PaystackError(
        `Paystack rejected ${path} (${response.status}): ${parsed.message ?? 'no message'}`,
        retryable,
      );
    }

    return parsed.data as T;
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

      const data = await request<{ authorization_url?: string; reference?: string }>(
        config,
        'POST',
        '/transaction/initialize',
        {
          email: input.email,
          amount: input.amountKobo,
          reference: input.reference,
          currency: input.currency,
          ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
          // Platform mode splits the charge to the merchant's subaccount, which
          // also absorbs the Paystack fee. Direct mode sends no subaccount.
          ...(input.subaccountCode
            ? { subaccount: input.subaccountCode, bearer: 'subaccount' }
            : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
        },
      );

      const url = data?.authorization_url;
      const reference = data?.reference ?? input.reference;
      if (!url) {
        throw new PaystackError('Paystack returned no authorization URL', false);
      }
      return { authorizationUrl: url, providerReference: reference };
    },

    async refund(input) {
      if (config.mode === 'sandbox') {
        return { providerReference: `sandbox_refund_${input.providerReference}` };
      }

      const data = await request<{ id?: number | string }>(config, 'POST', '/refund', {
        transaction: input.providerReference,
        ...(input.amountKobo === undefined ? {} : { amount: input.amountKobo }),
      });

      return { providerReference: String(data?.id ?? 'refund') };
    },

    async verifyCredentials() {
      if (config.mode === 'sandbox') return;
      await request<unknown>(config, 'GET', '/balance');
    },

    async listBanks() {
      if (config.mode === 'sandbox') return [...SANDBOX_BANKS];

      const data = await request<{ code?: string; name?: string }[]>(
        config,
        'GET',
        '/bank?currency=NGN&country=nigeria',
      );
      if (!Array.isArray(data)) {
        throw new PaystackError('Paystack returned an invalid bank list', false);
      }
      return data
        .filter((bank): bank is { code: string; name: string } => Boolean(bank.code && bank.name))
        .map((bank) => ({ code: bank.code, name: bank.name }));
    },

    async resolveAccount(input) {
      if (config.mode === 'sandbox') {
        return { accountName: `VELA SANDBOX ${input.accountNumber.slice(-4)}` };
      }

      const data = await request<{ account_name?: string }>(
        config,
        'GET',
        `/bank/resolve?account_number=${encodeURIComponent(input.accountNumber)}&bank_code=${encodeURIComponent(input.bankCode)}`,
      );
      if (!data?.account_name) {
        throw new PaystackError('Paystack could not resolve that account', false);
      }
      return { accountName: data.account_name };
    },

    async createSubaccount(input) {
      if (config.mode === 'sandbox') {
        const digest = createHash('sha256')
          .update(`${input.businessName}|${input.bankCode}|${input.accountNumber}`)
          .digest('hex');
        return { subaccountCode: `ACCT_sandbox_${digest.slice(0, 10)}` };
      }

      const data = await request<{ subaccount_code?: string }>(config, 'POST', '/subaccount', {
        business_name: input.businessName,
        settlement_bank: input.bankCode,
        account_number: input.accountNumber,
        percentage_charge: input.percentageCharge,
      });
      if (!data?.subaccount_code) {
        throw new PaystackError('Paystack returned no subaccount code', false);
      }
      return { subaccountCode: data.subaccount_code };
    },
  };
}
