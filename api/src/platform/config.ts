import { z } from 'zod';

/**
 * Configuration is parsed once at boot. A missing or weak secret is a hard
 * failure: the process must never start in a half-configured state (P9, fail closed).
 */
export class ConfigError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Invalid environment configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`,
    );
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

export interface CorsOriginRule {
  readonly scheme: 'http:' | 'https:';
  readonly host: string;
  readonly port: string;
  readonly allowSubdomains: boolean;
}

export interface AppConfig {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly isProduction: boolean;
  readonly isTest: boolean;
  readonly port: number;
  readonly host: string;
  readonly logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  readonly databaseUrl: string;
  readonly jwtSecret: string;
  readonly jwtIssuer: string;
  readonly jwtAudience: string;
  readonly corsOrigins: readonly string[];
  readonly corsRules: readonly CorsOriginRule[];
  readonly rateLimitMax: number;
  readonly rateLimitPublicMax: number;
  readonly paystackMode: 'live' | 'sandbox' | 'disabled';
  readonly paystackSecretKey: string | null;
  readonly paystackApiBase: string;
  /** Base64-encoded 32-byte KEK for merchant payment credentials. */
  readonly paymentEncryptionKey: string | null;
  /** Live with all three WhatsApp values; sandbox outside production; disabled in production. */
  readonly messagingMode: 'live' | 'sandbox' | 'disabled';
  readonly whatsappAccessToken: string | null;
  readonly whatsappPhoneNumberId: string | null;
  readonly whatsappAppSecret: string | null;
  readonly whatsappVerifyToken: string | null;
  readonly whatsappApiBase: string;
  readonly agentMode: 'sandbox' | 'disabled';
  readonly bodyLimitBytes: number;
  readonly trustProxy: boolean;
  readonly version: string;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(5050),
  HOST: z.string().min(1).default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) => /^postgres(ql)?:\/\//.test(value),
      'must be a postgres:// connection string',
    ),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_ISSUER: z.string().min(1).default('vela-api'),
  JWT_AUDIENCE: z.string().min(1).default('vela-client'),
  CORS_ORIGINS: z.string().min(1, 'must list at least one origin'),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100_000).default(300),
  RATE_LIMIT_PUBLIC_MAX: z.coerce.number().int().min(1).max(100_000).default(60),
  // Optional: without it, development/test run the sandbox adapter and
  // production refuses money routes instead of pretending to charge.
  PAYSTACK_SECRET_KEY: z.string().trim().optional(),
  PAYSTACK_API_BASE: z.url().default('https://api.paystack.co'),
  // Optional outside production (derived from JWT_SECRET for local dev), required
  // in production so connected merchant keys are never stored under a weak key.
  PAYMENT_ENCRYPTION_KEY: z.string().trim().optional(),
  // WhatsApp Cloud API. Without the token, phone number id, and app secret,
  // development/test run the sandbox adapter and production disables sends.
  WHATSAPP_ACCESS_TOKEN: z.string().trim().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().trim().max(64).optional(),
  WHATSAPP_APP_SECRET: z.string().trim().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().trim().min(8).max(128).optional(),
  WHATSAPP_API_BASE: z.url().default('https://graph.facebook.com/v21.0'),
  AGENT_MODE: z.enum(['sandbox', 'disabled']).default('sandbox'),
  BODY_LIMIT_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(10 * 1024 * 1024)
    .default(1024 * 1024),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  APP_VERSION: z.string().min(1).default('dev'),
});

const FORBIDDEN_SECRETS = new Set([
  'changeme',
  'change-me',
  'change_me',
  'secret',
  'jwt-secret',
  'jwt_secret',
  'your-secret',
  'your_secret',
  'example',
  'password',
  'development',
  'test',
  'ci',
]);

/** Rejects placeholders and low-variety strings without ever echoing the value. */
function assertSecret(secret: string): void {
  const normalized = secret.trim().toLowerCase();
  if (FORBIDDEN_SECRETS.has(normalized)) {
    throw new Error('JWT_SECRET must not be a placeholder value');
  }
  if (new Set(secret).size < 12) {
    throw new Error(
      'JWT_SECRET must contain at least 12 distinct characters (generate it randomly)',
    );
  }
}

function parseCorsRules(raw: string, isProduction: boolean): CorsOriginRule[] {
  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (entries.length === 0) {
    throw new Error('CORS_ORIGINS must list at least one origin');
  }

  const seen = new Set<string>();
  const rules: CorsOriginRule[] = [];

  for (const entry of entries) {
    if (entry.includes('*') && !entry.includes('://*.')) {
      throw new Error(
        `CORS_ORIGINS entry "${entry}" uses an unsupported wildcard; use https://*.example.com or an exact origin`,
      );
    }

    const allowSubdomains = entry.includes('://*.');
    const probe = allowSubdomains ? entry.replace('://*.', '://wildcard-probe.') : entry;

    let url: URL;
    try {
      url = new URL(probe);
    } catch {
      throw new Error(`CORS_ORIGINS entry "${entry}" is not an absolute origin`);
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`CORS_ORIGINS entry "${entry}" must use http or https`);
    }
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new Error(
        `CORS_ORIGINS entry "${entry}" must be an origin only (no path, query, or credentials)`,
      );
    }
    if (isProduction && url.protocol !== 'https:' && url.hostname !== 'localhost') {
      throw new Error(`CORS_ORIGINS entry "${entry}" must use https outside local development`);
    }

    const host = allowSubdomains
      ? url.hostname.slice('wildcard-probe.'.length).toLowerCase()
      : url.hostname.toLowerCase();

    if (host.length === 0 || (!host.includes('.') && host !== 'localhost')) {
      throw new Error(`CORS_ORIGINS entry "${entry}" must include a full hostname`);
    }

    const rule: CorsOriginRule = {
      scheme: url.protocol,
      host,
      port: url.port,
      allowSubdomains,
    };

    const key = `${rule.scheme}//${rule.allowSubdomains ? '*.' : ''}${rule.host}:${rule.port}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push(rule);
  }

  return rules;
}

/**
 * Parses the environment into a validated config. Throws {@link ConfigError}
 * listing only field names and rule failures, never the values themselves.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.') || 'env';
      return `${path}: ${issue.message}`;
    });
    throw new ConfigError(issues);
  }

  const envValues = parsed.data;
  const isProduction = envValues.NODE_ENV === 'production';
  const issues: string[] = [];

  try {
    assertSecret(envValues.JWT_SECRET);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : 'JWT_SECRET is invalid');
  }

  let corsRules: CorsOriginRule[] = [];
  try {
    corsRules = parseCorsRules(envValues.CORS_ORIGINS, isProduction);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : 'CORS_ORIGINS is invalid');
  }

  if (isProduction && !envValues.PAYMENT_ENCRYPTION_KEY) {
    issues.push(
      'PAYMENT_ENCRYPTION_KEY is required in production to encrypt connected credentials',
    );
  }
  if (envValues.PAYMENT_ENCRYPTION_KEY) {
    const decoded = Buffer.from(envValues.PAYMENT_ENCRYPTION_KEY, 'base64');
    if (decoded.length !== 32) {
      issues.push(
        'PAYMENT_ENCRYPTION_KEY must be 32 bytes, base64 encoded (openssl rand -base64 32)',
      );
    }
  }

  if (issues.length > 0) {
    throw new ConfigError(issues);
  }

  const paystackSecretKey = envValues.PAYSTACK_SECRET_KEY ? envValues.PAYSTACK_SECRET_KEY : null;
  const paystackMode: AppConfig['paystackMode'] = paystackSecretKey
    ? 'live'
    : isProduction
      ? 'disabled'
      : 'sandbox';

  const whatsappAccessToken = envValues.WHATSAPP_ACCESS_TOKEN ?? null;
  const whatsappPhoneNumberId = envValues.WHATSAPP_PHONE_NUMBER_ID ?? null;
  const whatsappAppSecret = envValues.WHATSAPP_APP_SECRET ?? null;
  const messagingConfigured = Boolean(
    whatsappAccessToken && whatsappPhoneNumberId && whatsappAppSecret,
  );
  const messagingMode: AppConfig['messagingMode'] = messagingConfigured
    ? 'live'
    : isProduction
      ? 'disabled'
      : 'sandbox';

  if (messagingMode === 'live' && !envValues.WHATSAPP_VERIFY_TOKEN) {
    issues.push('WHATSAPP_VERIFY_TOKEN is required when WhatsApp credentials are configured');
  }
  if (issues.length > 0) {
    throw new ConfigError(issues);
  }

  return {
    nodeEnv: envValues.NODE_ENV,
    isProduction,
    isTest: envValues.NODE_ENV === 'test',
    port: envValues.PORT,
    host: envValues.HOST,
    logLevel: envValues.LOG_LEVEL,
    databaseUrl: envValues.DATABASE_URL,
    jwtSecret: envValues.JWT_SECRET,
    jwtIssuer: envValues.JWT_ISSUER,
    jwtAudience: envValues.JWT_AUDIENCE,
    corsOrigins: corsRules.map(
      (rule) =>
        `${rule.scheme}//${rule.allowSubdomains ? '*.' : ''}${rule.host}${rule.port ? `:${rule.port}` : ''}`,
    ),
    corsRules,
    rateLimitMax: envValues.RATE_LIMIT_MAX,
    rateLimitPublicMax: envValues.RATE_LIMIT_PUBLIC_MAX,
    paystackMode,
    paystackSecretKey,
    paystackApiBase: envValues.PAYSTACK_API_BASE,
    paymentEncryptionKey: envValues.PAYMENT_ENCRYPTION_KEY ?? null,
    messagingMode,
    whatsappAccessToken,
    whatsappPhoneNumberId,
    whatsappAppSecret,
    whatsappVerifyToken:
      envValues.WHATSAPP_VERIFY_TOKEN ?? (isProduction ? null : 'vela-sandbox-verify'),
    whatsappApiBase: envValues.WHATSAPP_API_BASE,
    agentMode: envValues.AGENT_MODE,
    bodyLimitBytes: envValues.BODY_LIMIT_BYTES,
    trustProxy: envValues.TRUST_PROXY === 'true',
    version: envValues.APP_VERSION,
  };
}
