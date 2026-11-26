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
    bodyLimitBytes: envValues.BODY_LIMIT_BYTES,
    trustProxy: envValues.TRUST_PROXY === 'true',
    version: envValues.APP_VERSION,
  };
}
