import { pino, stdTimeFunctions, type Logger, type LoggerOptions } from 'pino';
import type { AppConfig } from './config.js';

/**
 * Every path that could carry a credential or cardholder value. Adding to this
 * list is cheaper than auditing fifty call sites, so it is intentionally broad.
 */
export const REDACT_PATHS: readonly string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  "req.headers['x-api-key']",
  "res.headers['set-cookie']",
  'password',
  '*.password',
  'req.body.password',
  'token',
  '*.token',
  'req.body.token',
  'refreshToken',
  '*.refreshToken',
  'otp',
  '*.otp',
  'req.body.otp',
  'secret',
  '*.secret',
  'card',
  '*.card',
  'cardNumber',
  '*.cardNumber',
  'accountNumber',
  '*.accountNumber',
  'credential',
  '*.credential',
];

export const REDACT_CENSOR = '[Redacted]';

/** Pino options shared by Fastify (which builds its own logger) and the worker. */
export function loggerOptions(config: AppConfig, service = 'vela-api'): LoggerOptions {
  const options: LoggerOptions = {
    level: config.logLevel,
    base: { service, env: config.nodeEnv, version: config.version },
    redact: { paths: [...REDACT_PATHS], censor: REDACT_CENSOR },
    timestamp: stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  // Tests keep plain JSON on stdout: a pretty-print worker is noise there and
  // can swallow lines when the process exits quickly.
  if (!config.isProduction && !config.isTest && config.logLevel !== 'silent') {
    return {
      ...options,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
    };
  }

  return options;
}

export function createLogger(config: AppConfig, service = 'vela-api'): Logger {
  return pino(loggerOptions(config, service));
}
