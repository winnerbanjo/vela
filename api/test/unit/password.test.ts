import { describe, expect, it } from 'vitest';
import {
  assertPasswordPolicy,
  getDummyPasswordHash,
  hashPassword,
  verifyPassword,
} from '../../src/modules/identity/password.js';
import { ValidationError } from '../../src/platform/errors.js';

describe('password policy', () => {
  it('accepts a reasonable passphrase', () => {
    expect(() => assertPasswordPolicy('correct horse battery staple')).not.toThrow();
  });

  it('rejects passwords shorter than 10 characters', () => {
    expect(() => assertPasswordPolicy('short1234')).toThrow(ValidationError);
  });

  it('rejects the maximum length boundary being exceeded', () => {
    expect(() => assertPasswordPolicy('a'.repeat(129))).toThrow(ValidationError);
  });

  it('rejects common passwords and single-character repetition', () => {
    expect(() => assertPasswordPolicy('password1234')).toThrow(ValidationError);
    expect(() => assertPasswordPolicy('aaaaaaaaaaaa')).toThrow(ValidationError);
  });

  it('rejects the user email or name used as the password', () => {
    expect(() => assertPasswordPolicy('owner@example.com', { email: 'owner@example.com' })).toThrow(
      ValidationError,
    );
    expect(() => assertPasswordPolicy('teniola adebayo', { name: 'Teniola Adebayo' })).toThrow(
      ValidationError,
    );
  });

  it('never echoes the password in the error message', () => {
    const secret = 'short1';
    try {
      assertPasswordPolicy(secret);
      expect.unreachable('expected the policy to reject the password');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).not.toContain(secret);
    }
  });
});

describe('password hashing', () => {
  it('hashes with argon2id and verifies the right password', async () => {
    const hash = await hashPassword('correct horse battery staple');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'correct horse battery staple')).toBe(true);
    expect(await verifyPassword(hash, 'wrong password entirely')).toBe(false);
  }, 20_000);

  it('produces a different hash for the same password (unique salt)', async () => {
    const [first, second] = await Promise.all([
      hashPassword('correct horse battery staple'),
      hashPassword('correct horse battery staple'),
    ]);

    expect(first).not.toBe(second);
  }, 20_000);

  it('returns false for malformed hashes instead of throwing', async () => {
    expect(await verifyPassword('not-a-hash', 'anything')).toBe(false);
  });

  it('provides a reusable dummy hash for timing equalisation', async () => {
    const dummy = await getDummyPasswordHash();
    expect(dummy.startsWith('$argon2id$')).toBe(true);
    expect(await getDummyPasswordHash()).toBe(dummy);
  }, 20_000);
});
