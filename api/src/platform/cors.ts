import type { CorsOriginRule } from './config.js';

/**
 * Exact-origin matching with optional single-label subdomains.
 * Wildcards never match across labels, so `*.example.com` accepts
 * `shop.example.com` but rejects `a.b.example.com` and `example.com.evil.test`.
 */
export function isOriginAllowed(origin: string, rules: readonly CorsOriginRule[]): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.username || url.password) return false;
  if (url.pathname !== '/' || url.search || url.hash) return false;

  return rules.some((rule) => matchesRule(url, rule));
}

function matchesRule(url: URL, rule: CorsOriginRule): boolean {
  if (url.protocol !== rule.scheme) return false;
  if (url.port !== rule.port) return false;

  const host = url.hostname.toLowerCase();
  if (!rule.allowSubdomains) return host === rule.host;

  const suffix = `.${rule.host}`;
  if (!host.endsWith(suffix)) return false;

  const label = host.slice(0, -suffix.length);
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);
}

export type CorsOriginCallback = (error: Error | null, allow: boolean) => void;

/**
 * Resolver for `@fastify/cors`. Requests without an Origin header (server to
 * server, curl) are allowed because CORS does not apply to them; browsers that
 * send a disallowed Origin get no CORS headers at all.
 */
export function createCorsOriginResolver(rules: readonly CorsOriginRule[]) {
  return (origin: string | undefined, callback: CorsOriginCallback): void => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, isOriginAllowed(origin, rules));
  };
}
