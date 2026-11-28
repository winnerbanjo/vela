import type { OtpPurpose, Prisma, PrismaClient } from '@prisma/client';
import { RateLimitedError, UnauthorizedError } from '../../platform/errors.js';
import { generateOtpCode, hashOtp, verifyOtp } from './tokens.js';

/**
 * OTP lifecycle. Codes are hashed with a server pepper, single-use, bounded by
 * attempts and TTL, and rate limited per email + purpose.
 */

type Db = PrismaClient | Prisma.TransactionClient;

const HOUR_MS = 60 * 60 * 1000;

const TTL_MINUTES: Record<OtpPurpose, number> = {
  verify_email: 10,
  login: 10,
  reset_password: 10,
  staff_invite: 72 * 60,
};

const MAX_PER_HOUR: Record<OtpPurpose, number> = {
  verify_email: 3,
  login: 3,
  reset_password: 3,
  staff_invite: 10,
};

export interface IssueOtpInput {
  readonly email: string;
  readonly purpose: OtpPurpose;
  readonly userId?: string | null;
  readonly ip?: string | null;
}

export interface IssuedOtp {
  readonly code: string;
  readonly expiresAt: Date;
  readonly otpId: string;
}

/** Invalidates earlier unconsumed codes for the same email + purpose. */
export async function issueOtp(db: Db, pepper: string, input: IssueOtpInput): Promise<IssuedOtp> {
  const email = input.email.trim().toLowerCase();

  const recent = await db.otpCode.count({
    where: {
      email,
      purpose: input.purpose,
      createdAt: { gt: new Date(Date.now() - HOUR_MS) },
    },
  });
  if (recent >= MAX_PER_HOUR[input.purpose]) {
    throw new RateLimitedError('Too many codes requested; try again later');
  }

  const now = new Date();
  await db.otpCode.updateMany({
    where: { email, purpose: input.purpose, consumedAt: null },
    data: { consumedAt: now },
  });

  const code = generateOtpCode();
  const expiresAt = new Date(now.getTime() + TTL_MINUTES[input.purpose] * 60 * 1000);

  const otp = await db.otpCode.create({
    data: {
      email,
      userId: input.userId ?? null,
      purpose: input.purpose,
      codeHash: hashOtp(code, pepper),
      expiresAt,
      ip: input.ip ?? null,
    },
  });

  return { code, expiresAt, otpId: otp.id };
}

/**
 * Consumes the newest live code. Wrong codes increment attempts; exceeding the
 * limit makes the row unusable even if the right code arrives later.
 */
export async function consumeOtp(
  db: Db,
  pepper: string,
  input: { email: string; purpose: OtpPurpose; code: string },
): Promise<{ id: string; userId: string | null }> {
  const email = input.email.trim().toLowerCase();

  const otp = await db.otpCode.findFirst({
    where: {
      email,
      purpose: input.purpose,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp || otp.attempts >= otp.maxAttempts) {
    throw new UnauthorizedError('That code is invalid or has expired');
  }

  if (!verifyOtp(input.code, otp.codeHash, pepper)) {
    await db.otpCode.updateMany({
      where: { id: otp.id, attempts: { lt: otp.maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
    throw new UnauthorizedError('That code is invalid or has expired');
  }

  const consumed = await db.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count !== 1) {
    throw new UnauthorizedError('That code is invalid or has expired');
  }

  return { id: otp.id, userId: otp.userId };
}
