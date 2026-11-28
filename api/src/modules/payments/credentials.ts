import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import type { AppConfig } from '../../platform/config.js';
import { InternalError } from '../../platform/errors.js';

/**
 * Credential encryption for merchant-supplied payment secrets.
 *
 * A merchant's Paystack secret key and full account number must never be
 * readable from a database dump, a backup, or a log line. Values are sealed
 * with AES-256-GCM; the key comes from `PAYMENT_ENCRYPTION_KEY` in production
 * and is derived from `JWT_SECRET` only for local development and tests.
 */

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class CredentialError extends Error {
  constructor() {
    super('Stored payment credential could not be opened');
    this.name = 'CredentialError';
  }
}

/** 32-byte key used to seal merchant credentials. Never logged. */
export function credentialKey(config: AppConfig): Buffer {
  if (config.paymentEncryptionKey) {
    const decoded = Buffer.from(config.paymentEncryptionKey, 'base64');
    if (decoded.length !== 32) {
      throw new InternalError('PAYMENT_ENCRYPTION_KEY is not a 32-byte base64 key');
    }
    return decoded;
  }

  if (config.isProduction) {
    // Config validation already fails closed, but keep decryption unreachable.
    throw new InternalError('PAYMENT_ENCRYPTION_KEY is required in production');
  }

  return Buffer.from(hkdfSync('sha256', config.jwtSecret, 'vela', 'payment-credentials-v1', 32));
}

export function encryptCredential(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

export function decryptCredential(payload: string, key: Buffer): string {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== VERSION) throw new CredentialError();

  const [, ivPart, tagPart, ciphertextPart] = parts;
  if (!ivPart || !tagPart || !ciphertextPart) throw new CredentialError();

  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const ciphertext = Buffer.from(ciphertextPart, 'base64url');
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new CredentialError();

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // Wrong key or tampered ciphertext: fail closed, never return partial data.
    throw new CredentialError();
  }
}

/** Stable, non-reversible handle so a key can be compared without revealing it. */
export function credentialFingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function credentialLast4(value: string): string {
  return value.slice(-4);
}

/** Never render a full secret; last four plus a fingerprint prefix is enough. */
export function maskCredential(value: string): string {
  return `••••${value.slice(-4)}`;
}
