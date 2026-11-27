import { describe, expect, it } from 'vitest';
import {
  credentialFingerprint,
  credentialKey,
  credentialLast4,
  decryptCredential,
  encryptCredential,
} from '../../src/modules/payments/credentials.js';
import { testConfig } from '../helpers/config.js';

const key = credentialKey(testConfig());
const SECRET = 'sk_test_vela_fixture_not_a_real_key';

describe('payment credential encryption', () => {
  it('round-trips a secret key without storing it in the clear', () => {
    const sealed = encryptCredential(SECRET, key);

    expect(sealed.startsWith('v1.')).toBe(true);
    expect(sealed).not.toContain(SECRET);
    expect(sealed).not.toContain('fixture');
    expect(decryptCredential(sealed, key)).toBe(SECRET);
  });

  it('uses a fresh IV so two seals of the same value differ', () => {
    expect(encryptCredential(SECRET, key)).not.toBe(encryptCredential(SECRET, key));
  });

  it('rejects tampered ciphertext, a wrong key, and a malformed payload', () => {
    const sealed = encryptCredential(SECRET, key);
    const parts = sealed.split('.');
    const tampered = Buffer.from(parts[3] as string, 'base64url');
    tampered[0] = (tampered[0] as number) ^ 0xff;
    parts[3] = tampered.toString('base64url');

    expect(() => decryptCredential(parts.join('.'), key)).toThrow(/could not be opened/);
    expect(() => decryptCredential(sealed, Buffer.alloc(32, 1))).toThrow(/could not be opened/);
    expect(() => decryptCredential('v2.a.b.c', key)).toThrow(/could not be opened/);
    expect(() => decryptCredential('not-a-sealed-value', key)).toThrow(/could not be opened/);
  });

  it('exposes only a stable fingerprint and the last four characters', () => {
    expect(credentialFingerprint(SECRET)).toMatch(/^[0-9a-f]{64}$/);
    expect(credentialFingerprint(SECRET)).toBe(credentialFingerprint(SECRET));
    expect(credentialFingerprint(SECRET)).not.toContain(SECRET);
    expect(credentialLast4(SECRET)).toBe('_key');
  });

  it('derives a 32-byte development key and never reuses the JWT secret directly', () => {
    const config = testConfig();
    expect(credentialKey(config)).toHaveLength(32);
    expect(credentialKey(config).toString('utf8')).not.toBe(config.jwtSecret);
  });
});
