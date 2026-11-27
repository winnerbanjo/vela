import argon2 from 'argon2';
import { ValidationError } from '../../platform/errors.js';

/**
 * Password policy and hashing. This is the only module allowed to touch
 * password material: routes validate the policy, never the hash.
 */

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

// Small local denylist plus structural checks. A breach corpus lookup belongs
// in the auth service (network) and is deliberately not on the login path.
const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'password1234',
  '1234567890',
  '12345678901',
  'qwertyuiop',
  'letmein123',
  'iloveyou123',
  'admin123456',
  'welcome1234',
  'changeme123',
  'vela123456',
]);

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65_536, // 64 MiB
  timeCost: 3,
  parallelism: 1,
} as const;

export interface PasswordContext {
  readonly email?: string;
  readonly name?: string;
}

/**
 * Throws a client-safe validation error when the password is unusable.
 * Messages never echo the password itself.
 */
export function assertPasswordPolicy(password: string, context: PasswordContext = {}): void {
  if (typeof password !== 'string') {
    throw new ValidationError('Password is required');
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new ValidationError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new ValidationError(`Password must be at most ${PASSWORD_MAX_LENGTH} characters`);
  }

  const normalized = password.trim().toLowerCase();
  if (COMMON_PASSWORDS.has(normalized)) {
    throw new ValidationError('Password is too common');
  }
  if (/^(.)\1+$/.test(password)) {
    throw new ValidationError('Password must not be a single repeated character');
  }
  if (context.email && normalized === context.email.trim().toLowerCase()) {
    throw new ValidationError('Password must not be your email address');
  }
  if (context.name && normalized === context.name.trim().toLowerCase()) {
    throw new ValidationError('Password must not be your name');
  }
}

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/** Returns false for malformed hashes instead of throwing, so login stays opaque. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * A real argon2 hash used when the email is unknown, so a missing account and a
 * wrong password take the same time. Cached after the first login attempt.
 */
export function getDummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword('vela-timing-equalisation-dummy-password');
  return dummyHash;
}
