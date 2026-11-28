import type { Merchant, MerchantIntegration, WhatsappThread } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { AppConfig } from '../../platform/config.js';
import { ConflictError, ForbiddenError } from '../../platform/errors.js';
import { credentialKey, decryptCredential } from '../payments/credentials.js';
import { isQuietHours, whatsappClient } from './whatsapp.js';

/**
 * One controlled exit point for outbound WhatsApp messages.
 *
 * Every send checks the merchant switch, opt-out, and quiet hours first, then
 * writes the message and the thread timestamp in the same transaction. The
 * provider call happens before the transaction so a slow network never holds a
 * row lock.
 */
export async function sendThreadMessage(input: {
  readonly db: PrismaClient;
  readonly config: AppConfig;
  readonly merchant: Pick<Merchant, 'timezone'>;
  readonly integration: Pick<
    MerchantIntegration,
    'whatsappEnabled' | 'whatsappPhoneNumberId' | 'whatsappTokenCiphertext'
  > | null;
  readonly thread: Pick<WhatsappThread, 'id' | 'merchantId' | 'waId' | 'optedOutAt'>;
  readonly body: string;
}) {
  const { db, config, merchant, integration, thread, body } = input;

  if (!integration?.whatsappEnabled) {
    throw new ForbiddenError('WhatsApp is not enabled for this merchant');
  }
  if (thread.optedOutAt) {
    throw new ConflictError('This customer opted out of WhatsApp messages');
  }
  if (isQuietHours(merchant.timezone)) {
    throw new ConflictError('Outside sending hours (08:00 to 21:00 in the business timezone)');
  }

  let accessToken: string | null = null;
  if (integration.whatsappTokenCiphertext) {
    accessToken = decryptCredential(integration.whatsappTokenCiphertext, credentialKey(config));
  }

  const client = whatsappClient(config, {
    accessToken,
    phoneNumberId: integration.whatsappPhoneNumberId,
  });
  const { providerMessageId } = await client.sendText({ to: thread.waId, body });
  const now = new Date();

  return db.$transaction(async (tx) => {
    const message = await tx.whatsappMessage.create({
      data: {
        merchantId: thread.merchantId,
        threadId: thread.id,
        direction: 'outbound',
        status: 'sent',
        providerMessageId,
        body,
        sentAt: now,
      },
    });

    await tx.whatsappThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: now },
    });

    return message;
  });
}
