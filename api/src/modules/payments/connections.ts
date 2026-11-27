import type { PaymentSettings } from '@prisma/client';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createAuthGuards } from '../../platform/auth.js';
import { writeAudit } from '../../platform/audit.js';
import type { AppConfig } from '../../platform/config.js';
import {
  ConflictError,
  NotImplementedError,
  NotFoundError,
  ValidationError,
} from '../../platform/errors.js';
import {
  credentialFingerprint,
  credentialKey,
  credentialLast4,
  encryptCredential,
} from './credentials.js';
import {
  createPaystackClient,
  PaystackError,
  type PaystackClient,
  type PaystackConfig,
} from './paystack.js';
import { merchantSecretKey, platformPaystackConfig, type SettlementMode } from './settlement.js';
import { assertOwnerPassword } from './step-up.js';

/**
 * Payment connections: platform subaccount vs the merchant's own Paystack
 * account, plus the verified payout bank account.
 *
 * Writes are owner-only and require the owner's password again. Secrets are
 * sealed before they touch the database and are never returned, logged, or
 * echoed in an audit row.
 */

const secretKeySchema = z
  .string()
  .trim()
  .regex(/^sk_(test|live)_[A-Za-z0-9_-]{12,200}$/, 'must be a Paystack secret key');

const settingsSchema = z
  .object({
    mode: z.enum(['platform', 'direct']),
    secretKey: secretKeySchema.optional(),
    password: z.string().min(1).max(128),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.mode === 'direct' && !value.secretKey) {
      ctx.addIssue({ code: 'custom', path: ['secretKey'], message: 'A secret key is required' });
    }
    if (value.mode === 'platform' && value.secretKey) {
      ctx.addIssue({
        code: 'custom',
        path: ['secretKey'],
        message: 'A secret key is only accepted in direct mode',
      });
    }
  });

const payoutSchema = z
  .object({
    bankCode: z
      .string()
      .trim()
      .regex(/^\d{3,6}$/),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{10}$/),
    password: z.string().min(1).max(128),
  })
  .strict();

const disconnectSchema = z.object({ password: z.string().min(1).max(128) }).strict();

function serializeSettings(config: AppConfig, settings: PaymentSettings | null) {
  const platformAvailable = config.paystackMode !== 'disabled';
  const directConnected = Boolean(
    settings?.mode === 'direct' && settings.status === 'active' && settings.secretKeyCiphertext,
  );

  const payout = settings?.accountName
    ? {
        bankCode: settings.bankCode,
        bankName: settings.bankName,
        accountName: settings.accountName,
        accountNumberLast4: settings.accountNumberLast4,
        verifiedAt: settings.bankVerifiedAt?.toISOString() ?? null,
      }
    : null;

  const ready =
    settings?.mode === 'direct'
      ? directConnected
      : platformAvailable && (config.paystackMode !== 'live' || Boolean(settings?.subaccountCode));

  return {
    mode: settings?.mode ?? ('platform' as SettlementMode),
    status: settings?.status ?? 'active',
    platform: {
      available: platformAvailable,
      mode: config.paystackMode,
      subaccountCode: settings?.subaccountCode ?? null,
    },
    direct: {
      connected: directConnected,
      keyLast4: settings?.secretKeyLast4 ?? null,
      verifiedAt: settings?.providerVerifiedAt?.toISOString() ?? null,
    },
    payout,
    ready,
    updatedAt: settings?.updatedAt.toISOString() ?? null,
  };
}

function directClient(config: AppConfig, secretKey: string): PaystackClient {
  const paystackConfig: PaystackConfig = {
    // Sandbox is the only non-network mode; `disabled` in production still
    // allows a merchant's own live key to be used.
    mode: config.paystackMode === 'sandbox' ? 'sandbox' : 'live',
    secretKey,
    apiBase: config.paystackApiBase,
  };
  return createPaystackClient(paystackConfig);
}

async function settingsFor(
  app: FastifyInstance,
  merchantId: string,
): Promise<PaymentSettings | null> {
  return app.db.paymentSettings.findUnique({ where: { merchantId } });
}

/** Client used for read-only bank operations, following the merchant's mode. */
async function bankClient(
  app: FastifyInstance,
  config: AppConfig,
  merchantId: string,
): Promise<PaystackClient> {
  const settings = await settingsFor(app, merchantId);
  if (settings?.mode === 'direct' && settings.status === 'active' && settings.secretKeyCiphertext) {
    return directClient(config, merchantSecretKey(config, settings));
  }
  if (config.paystackMode === 'disabled') {
    throw new NotImplementedError('The platform Paystack account is not configured');
  }
  return createPaystackClient(platformPaystackConfig(config));
}

function toPaystackConflict(error: unknown, message: string): never {
  if (error instanceof PaystackError && error.retryable) {
    throw new ConflictError('Paystack is unavailable right now; try again shortly');
  }
  throw new ValidationError(message);
}

export const paymentConnectionRoutes: FastifyPluginAsync<{ config: AppConfig }> = async (
  app,
  { config },
) => {
  const guards = createAuthGuards(app, config);
  const staffOnly = [guards.requireMerchant];
  const ownerOnly = [guards.requireMerchant, guards.requireRole('owner')];

  app.get('/payments/settings', { preHandler: staffOnly }, async (request) => {
    const settings = await settingsFor(app, request.auth?.merchantId as string);
    return { settings: serializeSettings(config, settings) };
  });

  app.put('/payments/settings', { preHandler: ownerOnly }, async (request) => {
    const body = settingsSchema.parse(request.body ?? {});
    await assertOwnerPassword(app, request, body.password);

    const merchantId = request.auth?.merchantId as string;
    const existing = await settingsFor(app, merchantId);

    if (body.mode === 'platform' && config.paystackMode === 'disabled') {
      throw new NotImplementedError('The platform Paystack account is not configured');
    }

    // A checkout already opened under this key can still settle. Changing or
    // removing the credential first would make its webhook unverifiable.
    if (existing?.mode === 'direct') {
      const changingKey =
        body.mode === 'platform' ||
        !body.secretKey ||
        credentialFingerprint(body.secretKey) !== existing.secretKeyFingerprint;
      if (changingKey) {
        const pending = await app.db.payment.count({
          where: { merchantId, settlementMode: 'direct', status: 'pending' },
        });
        if (pending > 0) {
          throw new ConflictError(
            'A direct payment is still pending; wait for it to settle before changing the Paystack connection',
          );
        }
      }
    }

    let secretKeyCiphertext: string | null = null;
    let secretKeyLast4: string | null = null;
    let secretKeyFingerprint: string | null = null;
    let providerVerifiedAt: Date | null = null;

    if (body.mode === 'direct' && body.secretKey) {
      const key = body.secretKey;

      // Never store a key Paystack rejects. Outside sandbox the key must work
      // against the live API before it is sealed.
      if (config.paystackMode !== 'sandbox') {
        try {
          await directClient(config, key).verifyCredentials();
        } catch (error) {
          toPaystackConflict(error, 'Paystack rejected that secret key');
        }
        providerVerifiedAt = new Date();
      }

      secretKeyCiphertext = encryptCredential(key, credentialKey(config));
      secretKeyLast4 = credentialLast4(key);
      secretKeyFingerprint = credentialFingerprint(key);
    }

    const saved = await app.db.$transaction(async (tx) => {
      const upserted = await tx.paymentSettings.upsert({
        where: { merchantId },
        create: {
          merchantId,
          mode: body.mode,
          status: 'active',
          secretKeyCiphertext,
          secretKeyLast4,
          secretKeyFingerprint,
          providerVerifiedAt,
        },
        update: {
          mode: body.mode,
          status: 'active',
          secretKeyCiphertext,
          secretKeyLast4,
          secretKeyFingerprint,
          providerVerifiedAt,
        },
      });

      await writeAudit(tx, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'payment.settings.updated',
        entityType: 'payment_settings',
        entityId: upserted.id,
        ...(existing ? { before: { mode: existing.mode, keyLast4: existing.secretKeyLast4 } } : {}),
        after: { mode: upserted.mode, keyLast4: upserted.secretKeyLast4 },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return upserted;
    });

    return { settings: serializeSettings(config, saved) };
  });

  /** Disconnects the merchant's own Paystack key. The payout record is kept. */
  app.delete('/payments/settings', { preHandler: ownerOnly }, async (request) => {
    const body = disconnectSchema.parse(request.body ?? {});
    await assertOwnerPassword(app, request, body.password);

    const merchantId = request.auth?.merchantId as string;
    const existing = await settingsFor(app, merchantId);
    if (!existing || existing.mode !== 'direct') {
      throw new NotFoundError('No direct Paystack connection to remove');
    }

    const pending = await app.db.payment.count({
      where: { merchantId, settlementMode: 'direct', status: 'pending' },
    });
    if (pending > 0) {
      throw new ConflictError(
        'A direct payment is still pending; wait for it to settle before disconnecting',
      );
    }

    const saved = await app.db.$transaction(async (tx) => {
      const updated = await tx.paymentSettings.update({
        where: { merchantId },
        data: {
          status: 'disabled',
          secretKeyCiphertext: null,
          secretKeyLast4: null,
          secretKeyFingerprint: null,
          providerVerifiedAt: null,
        },
      });

      await writeAudit(tx, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'payment.settings.disconnected',
        entityType: 'payment_settings',
        entityId: updated.id,
        before: { mode: existing.mode, keyLast4: existing.secretKeyLast4 },
        after: { mode: updated.mode, status: updated.status },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return updated;
    });

    return { settings: serializeSettings(config, saved) };
  });

  app.get('/payments/banks', { preHandler: staffOnly }, async (request) => {
    const merchantId = request.auth?.merchantId as string;
    const client = await bankClient(app, config, merchantId);
    const banks = await client.listBanks();
    return { banks };
  });

  /**
   * Verifies an account with the provider and stores it sealed. In platform
   * mode it also creates the Paystack subaccount that receives the merchant's
   * share at checkout; in direct mode the merchant's Paystack dashboard owns
   * settlement, so the verified account is recorded but not used for splits.
   */
  app.post('/payments/payout-account', { preHandler: ownerOnly }, async (request) => {
    const body = payoutSchema.parse(request.body ?? {});
    await assertOwnerPassword(app, request, body.password);

    const merchantId = request.auth?.merchantId as string;
    const existing = await settingsFor(app, merchantId);
    const mode: SettlementMode = existing?.mode ?? 'platform';
    if (mode === 'direct' && (existing?.status !== 'active' || !existing.secretKeyCiphertext)) {
      throw new ConflictError('Reconnect your Paystack account before adding a payout account');
    }
    const client = await bankClient(app, config, merchantId);

    let accountName: string;
    let bankName: string;
    let subaccountCode: string | null = null;
    try {
      const banks = await client.listBanks();
      const bank = banks.find((entry) => entry.code === body.bankCode);
      if (!bank) throw new ValidationError('Unknown bank code');
      bankName = bank.name;

      const resolved = await client.resolveAccount({
        bankCode: body.bankCode,
        accountNumber: body.accountNumber,
      });
      accountName = resolved.accountName;

      if (mode === 'platform') {
        const merchant = await app.db.merchant.findUniqueOrThrow({
          where: { id: merchantId },
          select: { name: true },
        });
        const subaccount = await client.createSubaccount({
          businessName: merchant.name,
          bankCode: body.bankCode,
          accountNumber: body.accountNumber,
          // Vela takes no commission today; the merchant receives the full split.
          percentageCharge: 0,
        });
        subaccountCode = subaccount.subaccountCode;
      }
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      toPaystackConflict(error, 'Paystack could not verify that bank account');
    }

    const saved = await app.db.$transaction(async (tx) => {
      const upserted = await tx.paymentSettings.upsert({
        where: { merchantId },
        create: {
          merchantId,
          mode,
          status: existing?.status ?? 'active',
          subaccountCode,
          bankCode: body.bankCode,
          bankName,
          accountName,
          accountNumberCiphertext: encryptCredential(body.accountNumber, credentialKey(config)),
          accountNumberLast4: credentialLast4(body.accountNumber),
          bankVerifiedAt: new Date(),
        },
        update: {
          subaccountCode,
          bankCode: body.bankCode,
          bankName,
          accountName,
          accountNumberCiphertext: encryptCredential(body.accountNumber, credentialKey(config)),
          accountNumberLast4: credentialLast4(body.accountNumber),
          bankVerifiedAt: new Date(),
        },
      });

      await writeAudit(tx, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'payment.payout_account.updated',
        entityType: 'payment_settings',
        entityId: upserted.id,
        ...(existing?.accountNumberLast4
          ? {
              before: {
                bankCode: existing.bankCode,
                accountNumberLast4: existing.accountNumberLast4,
                subaccountCode: existing.subaccountCode,
              },
            }
          : {}),
        after: {
          bankCode: upserted.bankCode,
          accountNumberLast4: upserted.accountNumberLast4,
          subaccountCode: upserted.subaccountCode,
        },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return upserted;
    });

    return { settings: serializeSettings(config, saved) };
  });

  /**
   * Removes the payout destination from Vela. Paystack keeps the subaccount
   * record, but no future checkout will use it.
   */
  app.delete('/payments/payout-account', { preHandler: ownerOnly }, async (request) => {
    const body = disconnectSchema.parse(request.body ?? {});
    await assertOwnerPassword(app, request, body.password);

    const merchantId = request.auth?.merchantId as string;
    const existing = await settingsFor(app, merchantId);
    if (!existing?.accountName) throw new NotFoundError('No payout account to remove');

    const saved = await app.db.$transaction(async (tx) => {
      const updated = await tx.paymentSettings.update({
        where: { merchantId },
        data: {
          subaccountCode: null,
          bankCode: null,
          bankName: null,
          accountName: null,
          accountNumberCiphertext: null,
          accountNumberLast4: null,
          bankVerifiedAt: null,
        },
      });

      await writeAudit(tx, {
        merchantId,
        actorId: request.auth?.userId ?? null,
        actorRole: request.auth?.role ?? null,
        action: 'payment.payout_account.removed',
        entityType: 'payment_settings',
        entityId: updated.id,
        before: {
          bankCode: existing.bankCode,
          accountNumberLast4: existing.accountNumberLast4,
          subaccountCode: existing.subaccountCode,
        },
        after: { payoutAccount: null },
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        requestId: request.id,
      });

      return updated;
    });

    return { settings: serializeSettings(config, saved) };
  });
};
