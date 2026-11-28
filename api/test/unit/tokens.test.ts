import { describe, expect, it } from 'vitest';
import {
  constantTimeEqual,
  deriveOtpPepper,
  generateOpaqueToken,
  generateOtpCode,
  hashOtp,
  hashToken,
  verifyOtp,
} from '../../src/modules/identity/tokens.js';

describe('opaque tokens', () => {
  it('generates 256-bit URL-safe tokens', () => {
    const token = generateOpaqueToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateOpaqueToken()).not.toBe(token);
  });

  it('stores only a 64-character SHA-256 digest', () => {
    const token = generateOpaqueToken();

    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
  });
});

describe('OTP codes', () => {
  it('generates exactly six digits, including leading zeros', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });

  it('hashes with a pepper so the digest is not portable', () => {
    const pepperA = deriveOtpPepper('secret-one-0123456789abcdef');
    const pepperB = deriveOtpPepper('secret-two-0123456789abcdef');
    const digest = hashOtp('123456', pepperA);

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOtp('123456', pepperB)).not.toBe(digest);
    expect(verifyOtp('123456', digest, pepperA)).toBe(true);
    expect(verifyOtp('654321', digest, pepperA)).toBe(false);
    expect(verifyOtp('123456', digest, pepperB)).toBe(false);
  });

  it('derives distinct peppers from distinct secrets', () => {
    expect(deriveOtpPepper('a'.repeat(40))).not.toBe(deriveOtpPepper('b'.repeat(40)));
  });
});

describe('constant-time comparison', () => {
  it('accepts equal strings and rejects length or content mismatches', () => {
    expect(constantTimeEqual('abc123', 'abc123')).toBe(true);
    expect(constantTimeEqual('abc123', 'abc124')).toBe(false);
    expect(constantTimeEqual('abc123', 'abc1234')).toBe(false);
  });
});
