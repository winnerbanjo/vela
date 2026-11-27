import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Opaque credentials (refresh tokens, invite tokens) and OTP codes are never
 * stored as plaintext. The database only ever sees a digest.
 */

/** 32 bytes of entropy, URL-safe, ~43 characters. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hex digest. Used for session and invite token lookups. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * OTPs are hashed with a server-held pepper so a database dump alone cannot be
 * brute-forced offline (6 digits is only 1e6 candidates).
 */
export function deriveOtpPepper(jwtSecret: string): string {
  return createHmac('sha256', jwtSecret).update('vela-otp-pepper-v1').digest('hex');
}

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(code: string, pepper: string): string {
  return createHmac('sha256', pepper).update(code, 'utf8').digest('hex');
}

/** Constant-time comparison for equal-length hex digests. */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Compares a presented OTP against a stored digest without leaking length. */
export function verifyOtp(code: string, storedHash: string, pepper: string): boolean {
  return constantTimeEqual(hashOtp(code, pepper), storedHash);
}
