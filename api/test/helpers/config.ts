import { loadConfig, type AppConfig } from '../../src/platform/config.js';

/**
 * A valid baseline config. Tests override individual variables to assert the
 * validation rules without repeating the whole environment.
 */
export function testConfig(overrides: NodeJS.ProcessEnv = {}): AppConfig {
  return loadConfig({
    NODE_ENV: 'test',
    PORT: '5050',
    LOG_LEVEL: 'silent',
    DATABASE_URL:
      process.env.DATABASE_URL ??
      'postgresql://vela:vela_local_only@localhost:5435/vela?schema=public',
    JWT_SECRET: 'unit-test-only-8f3a1c9b7d2e4f6a0c5b8d1e3f7a9c2b',
    CORS_ORIGINS: 'http://localhost:3002',
    ...overrides,
  });
}

export const hasDatabase = Boolean(process.env.DATABASE_URL);
