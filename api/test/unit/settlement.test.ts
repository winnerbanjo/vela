import { describe, expect, it } from 'vitest';
import { credentialKey, encryptCredential } from '../../src/modules/payments/credentials.js';
import { webhookSecret } from '../../src/modules/payments/paystack.js';
import {
  decideSettlement,
  paystackClientForMode,
  platformPaystackConfig,
  type SettlementSettings,
} from '../../src/modules/payments/settlement.js';
import { testConfig } from '../helpers/config.js';

const config = testConfig();

function sealedKey(): string {
  return encryptCredential('sk_test_vela_fixture_not_a_real_key', credentialKey(config));
}

const platform: SettlementSettings = {
  mode: 'platform',
  status: 'active',
  secretKeyCiphertext: null,
  subaccountCode: null,
};

const direct: SettlementSettings = {
  mode: 'direct',
  status: 'active',
  secretKeyCiphertext: sealedKey(),
  subaccountCode: null,
};

describe('settlement routing', () => {
  it('defaults to the platform account in sandbox without a subaccount', () => {
    expect(decideSettlement(config, null)).toEqual({
      mode: 'platform',
      subaccountCode: null,
    });
    expect(decideSettlement(config, platform).mode).toBe('platform');
  });

  it('uses a direct-mode connection when it is active', () => {
    expect(decideSettlement(config, direct)).toEqual({ mode: 'direct', subaccountCode: null });
  });

  it('refuses a disconnected direct connection instead of falling back silently', () => {
    expect(() =>
      decideSettlement(config, {
        ...direct,
        status: 'disabled',
        secretKeyCiphertext: null,
      }),
    ).toThrow(/reconnect/i);
  });

  it('requires a verified subaccount once the platform is live', () => {
    const live = testConfig({ PAYSTACK_SECRET_KEY: 'sk_test_vela_fixture_not_a_real_key' });

    expect(() => decideSettlement(live, platform)).toThrow(/payout bank account/i);
    expect(decideSettlement(live, { ...platform, subaccountCode: 'ACCT_abc' })).toEqual({
      mode: 'platform',
      subaccountCode: 'ACCT_abc',
    });
  });

  it('fails closed when the platform account is disabled and there is no direct key', () => {
    const disabled = testConfig({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://app.example.com',
      PAYMENT_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    });

    expect(() => decideSettlement(disabled, null)).toThrow(/not configured/i);
    expect(() => paystackClientForMode(disabled, 'platform', null)).toThrow(/not configured/i);
  });

  it('builds a direct client from the sealed key and never from the platform key', async () => {
    const client = paystackClientForMode(config, 'direct', direct);
    const initialized = await client.initialize({
      email: 'amaka@example.com',
      amountKobo: 200_000,
      reference: 'VELA-DIRECT',
      currency: 'NGN',
    });

    expect(initialized.providerReference).toBe('sandbox_VELA-DIRECT');
    expect(() => paystackClientForMode(config, 'direct', platform)).toThrow(/no longer connected/i);
  });

  it('only exposes a webhook secret when the platform account can sign', () => {
    expect(webhookSecret(platformPaystackConfig(config))).toBe('sk_test_vela_sandbox_only');
    expect(webhookSecret({ ...platformPaystackConfig(config), mode: 'disabled' })).toBeNull();
    expect(
      webhookSecret({ mode: 'live', secretKey: 'sk_live_platform_only', apiBase: 'https://x' }),
    ).toBe('sk_live_platform_only');
  });
});
