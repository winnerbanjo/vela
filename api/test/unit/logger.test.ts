import { pino, type Logger } from 'pino';
import { describe, expect, it } from 'vitest';
import { REDACT_CENSOR, REDACT_PATHS } from '../../src/platform/logger.js';

function captureLogger(): { logger: Logger; read: () => string } {
  const lines: string[] = [];
  const logger = pino(
    { level: 'info', redact: { paths: [...REDACT_PATHS], censor: REDACT_CENSOR } },
    { write: (line: string) => lines.push(line) },
  );

  return { logger, read: () => lines.join('\n') };
}

describe('logger redaction', () => {
  it('redacts request credentials', () => {
    const { logger, read } = captureLogger();

    logger.info(
      {
        req: {
          headers: {
            authorization: 'Bearer super-secret-token',
            cookie: '__Host-vela_session=abc123',
            'x-api-key': 'pk_live_123',
          },
          body: { password: 'hunter2', otp: '123456', token: 'refresh-abc' },
        },
      },
      'incoming request',
    );

    const output = read();

    expect(output).not.toContain('super-secret-token');
    expect(output).not.toContain('abc123');
    expect(output).not.toContain('pk_live_123');
    expect(output).not.toContain('hunter2');
    expect(output).not.toContain('123456');
    expect(output).not.toContain('refresh-abc');
    expect(output).toContain(REDACT_CENSOR);
  });

  it('redacts payment and identity fields at any depth', () => {
    const { logger, read } = captureLogger();

    logger.warn(
      {
        card: '4111111111111111',
        accountNumber: '0123456789',
        payment: { cardNumber: '5500000000000004', secret: 'sk_test_x' },
        session: { refreshToken: 'rt_123' },
      },
      'payment event',
    );

    const output = read();

    for (const value of [
      '4111111111111111',
      '0123456789',
      '5500000000000004',
      'sk_test_x',
      'rt_123',
    ]) {
      expect(output).not.toContain(value);
    }
  });
});
