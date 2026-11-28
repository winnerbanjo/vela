import { describe, expect, it } from 'vitest';
import { loadConfig, type CorsOriginRule } from '../../src/platform/config.js';
import { isOriginAllowed } from '../../src/platform/cors.js';

function rules(raw: string): readonly CorsOriginRule[] {
  return loadConfig({
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'k3Y-8f3a1c9b7d2e4f6a0c5b8d1e3f7a9c2bQ',
    CORS_ORIGINS: raw,
  }).corsRules;
}

describe('isOriginAllowed', () => {
  const exact = rules('https://app.example.com,http://localhost:3002');

  it('accepts exact origins only', () => {
    expect(isOriginAllowed('https://app.example.com', exact)).toBe(true);
    expect(isOriginAllowed('http://localhost:3002', exact)).toBe(true);
    expect(isOriginAllowed('https://app.example.com:8443', exact)).toBe(false);
    expect(isOriginAllowed('http://app.example.com', exact)).toBe(false);
    expect(isOriginAllowed('https://evil.example.com', exact)).toBe(false);
  });

  it('rejects malformed or path-bearing origins', () => {
    expect(isOriginAllowed('not a url', exact)).toBe(false);
    expect(isOriginAllowed('https://app.example.com/path', exact)).toBe(false);
    expect(isOriginAllowed('https://user:pass@app.example.com', exact)).toBe(false);
    expect(isOriginAllowed('file://app.example.com', exact)).toBe(false);
  });

  describe('subdomain wildcard', () => {
    const wildcard = rules('https://*.example.com');

    it('accepts one label', () => {
      expect(isOriginAllowed('https://shop.example.com', wildcard)).toBe(true);
      expect(isOriginAllowed('https://barber-1.example.com', wildcard)).toBe(true);
    });

    it('rejects deeper nesting, the apex, and suffix tricks', () => {
      expect(isOriginAllowed('https://a.b.example.com', wildcard)).toBe(false);
      expect(isOriginAllowed('https://example.com', wildcard)).toBe(false);
      expect(isOriginAllowed('https://example.com.evil.test', wildcard)).toBe(false);
      expect(isOriginAllowed('https://evilexample.com', wildcard)).toBe(false);
    });

    it('respects scheme and port', () => {
      expect(isOriginAllowed('http://shop.example.com', wildcard)).toBe(false);
      expect(isOriginAllowed('https://shop.example.com:8443', wildcard)).toBe(false);
    });
  });
});
