import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../src/platform/config.js';

const BASE = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'k3Y-8f3a1c9b7d2e4f6a0c5b8d1e3f7a9c2bQ',
  CORS_ORIGINS: 'http://localhost:3002',
} satisfies NodeJS.ProcessEnv;

describe('loadConfig', () => {
  it('applies documented defaults', () => {
    const config = loadConfig({ ...BASE });

    expect(config.port).toBe(5050);
    expect(config.host).toBe('0.0.0.0');
    expect(config.nodeEnv).toBe('development');
    expect(config.rateLimitMax).toBe(300);
    expect(config.bodyLimitBytes).toBe(1_048_576);
    expect(config.trustProxy).toBe(false);
    expect(config.corsOrigins).toEqual(['http://localhost:3002']);
  });

  it('fails when JWT_SECRET is missing', () => {
    const { JWT_SECRET: _omitted, ...withoutSecret } = BASE;

    expect(() => loadConfig(withoutSecret)).toThrow(ConfigError);
    expect(() => loadConfig(withoutSecret)).toThrow(/JWT_SECRET/);
  });

  it('fails when JWT_SECRET is short or a placeholder', () => {
    expect(() => loadConfig({ ...BASE, JWT_SECRET: 'short' })).toThrow(/at least 32/);
    expect(() => loadConfig({ ...BASE, JWT_SECRET: 'changeme'.padEnd(40, 'h') })).toThrow(
      /placeholder|distinct/,
    );
  });

  it('fails when JWT_SECRET has too little variety', () => {
    expect(() => loadConfig({ ...BASE, JWT_SECRET: 'ab'.repeat(24) })).toThrow(/distinct/);
  });

  it('never echoes secret values in the error message', () => {
    const secret = 'changeme'.padEnd(40, 'h');
    try {
      loadConfig({ ...BASE, JWT_SECRET: secret });
      throw new Error('expected loadConfig to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as Error).message).not.toContain(secret);
    }
  });

  it('rejects wildcard and path CORS entries', () => {
    expect(() => loadConfig({ ...BASE, CORS_ORIGINS: '*' })).toThrow(/wildcard/);
    expect(() => loadConfig({ ...BASE, CORS_ORIGINS: 'https://app.example.com/admin' })).toThrow(
      /origin only/,
    );
    expect(() => loadConfig({ ...BASE, CORS_ORIGINS: 'not-a-url' })).toThrow(/absolute origin/);
  });

  it('rejects plain http origins in production', () => {
    expect(() =>
      loadConfig({
        ...BASE,
        NODE_ENV: 'production',
        CORS_ORIGINS: 'http://app.example.com',
      }),
    ).toThrow(/https/);
  });

  it('allows localhost http origins in production for smoke tests', () => {
    const config = loadConfig({
      ...BASE,
      NODE_ENV: 'production',
      CORS_ORIGINS: 'http://localhost:3002',
      PAYMENT_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    });

    expect(config.isProduction).toBe(true);
    expect(config.corsOrigins).toEqual(['http://localhost:3002']);
  });

  it('parses a subdomain wildcard into a single-label rule', () => {
    const config = loadConfig({ ...BASE, CORS_ORIGINS: 'https://*.example.com' });

    expect(config.corsOrigins).toEqual(['https://*.example.com']);
    expect(config.corsRules).toEqual([
      { scheme: 'https:', host: 'example.com', port: '', allowSubdomains: true },
    ]);
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(() => loadConfig({ ...BASE, DATABASE_URL: 'mysql://localhost/db' })).toThrow(/postgres/);
  });

  it('requires a 32-byte base64 payment encryption key in production', () => {
    expect(() =>
      loadConfig({ ...BASE, NODE_ENV: 'production', CORS_ORIGINS: 'https://app.example.com' }),
    ).toThrow(/PAYMENT_ENCRYPTION_KEY is required/);

    expect(() =>
      loadConfig({
        ...BASE,
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://app.example.com',
        PAYMENT_ENCRYPTION_KEY: 'too-short',
      }),
    ).toThrow(/32 bytes/);
  });
});
