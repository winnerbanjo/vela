import type { AppConfig } from '../../platform/config.js';
import { ConflictError, NotImplementedError } from '../../platform/errors.js';
import { credentialKey, decryptCredential } from './credentials.js';
import { createPaystackClient, type PaystackClient, type PaystackConfig } from './paystack.js';

/**
 * Settlement routing.
 *
 * Platform mode: the charge lands in Vela's Paystack account and is split to the
 * merchant's verified subaccount at checkout.
 * Direct mode: the charge is initialized with the merchant's own secret key and
 * settles in their Paystack account; Vela never holds the money.
 */

export type SettlementMode = 'platform' | 'direct';

export interface SettlementSettings {
  readonly mode: SettlementMode;
  readonly status: 'active' | 'disabled';
  readonly secretKeyCiphertext: string | null;
  readonly subaccountCode: string | null;
}

export interface SettlementDecision {
  readonly mode: SettlementMode;
  /** Present only in platform mode when the merchant has a verified subaccount. */
  readonly subaccountCode: string | null;
}

export function platformPaystackConfig(config: AppConfig): PaystackConfig {
  return {
    mode: config.paystackMode,
    secretKey: config.paystackSecretKey,
    apiBase: config.paystackApiBase,
  };
}

export function decideSettlement(
  config: AppConfig,
  settings: SettlementSettings | null,
): SettlementDecision {
  if (settings?.mode === 'direct') {
    if (settings.status !== 'active' || !settings.secretKeyCiphertext) {
      throw new ConflictError(
        'This merchant must reconnect their Paystack account before accepting payments',
      );
    }
    return { mode: 'direct', subaccountCode: null };
  }

  if (config.paystackMode === 'disabled') {
    throw new NotImplementedError('Payments are not configured');
  }
  // In live mode the platform must know where to send the merchant's share.
  // Sandbox stays usable so the flow can be exercised before go-live.
  if (config.paystackMode === 'live' && !settings?.subaccountCode) {
    throw new ConflictError('Connect a payout bank account before accepting payments');
  }

  return { mode: 'platform', subaccountCode: settings?.subaccountCode ?? null };
}

export function paystackClientForMode(
  config: AppConfig,
  mode: SettlementMode,
  settings: SettlementSettings | null,
): PaystackClient {
  if (mode === 'direct') {
    if (!settings || settings.status !== 'active' || !settings.secretKeyCiphertext) {
      throw new ConflictError(
        'The Paystack account used for this payment is no longer connected; refund it from Paystack',
      );
    }
    return createPaystackClient({
      mode: config.paystackMode === 'sandbox' ? 'sandbox' : 'live',
      secretKey: decryptCredential(settings.secretKeyCiphertext, credentialKey(config)),
      apiBase: config.paystackApiBase,
    });
  }

  if (config.paystackMode === 'disabled') {
    throw new NotImplementedError('Payments are not configured');
  }
  return createPaystackClient(platformPaystackConfig(config));
}

/** Decrypts the merchant key only for a direct-mode Paystack call. */
export function merchantSecretKey(config: AppConfig, settings: SettlementSettings): string {
  if (!settings.secretKeyCiphertext) {
    throw new ConflictError('This merchant has no connected Paystack key');
  }
  return decryptCredential(settings.secretKeyCiphertext, credentialKey(config));
}
