import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/**
 * Dependency gate for CI.
 *
 * `npm audit --omit=dev --audit-level=high` fails on any high advisory. Some
 * advisories cannot be fixed without a major upgrade. Rather than drop the
 * gate, those are listed here with an exact package + advisory id, a reason,
 * and an expiry date. Anything else at high/critical fails, and an expired
 * exception also fails.
 */

export interface AuditAllowlistEntry {
  readonly package: string;
  readonly ghsa: string;
  readonly reason: string;
  /** ISO date after which the exception stops being honoured. */
  readonly expires: string;
}

/**
 * Both entries come from `@prisma/config`, which Prisma's CLI and client
 * package pull in. They are build-time code paths, not request handling, and
 * the fix ships in Prisma 7 (a scheduled major upgrade).
 */
export const AUDIT_ALLOWLIST: readonly AuditAllowlistEntry[] = [
  {
    package: 'deepmerge-ts',
    ghsa: 'GHSA-ggr8-5vv4-36mx',
    reason: 'Prisma config merging at build time; fixed by the Prisma 7 upgrade.',
    expires: '2026-12-19',
  },
  {
    package: 'effect',
    ghsa: 'GHSA-7589-6fvf-x4pw',
    reason: 'Prisma config schema regex at build time; fixed by the Prisma 7 upgrade.',
    expires: '2026-12-19',
  },
];

interface AuditViaObject {
  readonly name?: string;
  readonly url?: string;
  readonly title?: string;
}

export interface AuditVulnerability {
  readonly severity: string;
  readonly via: readonly (string | AuditViaObject)[];
}

export interface AuditReport {
  readonly vulnerabilities?: Readonly<Record<string, AuditVulnerability>>;
  readonly error?: unknown;
}

export interface AuditEvaluation {
  readonly ok: boolean;
  readonly failures: readonly string[];
  readonly allowed: readonly string[];
}

const GHSA_PATTERN = /GHSA-[a-z0-9-]+/i;

function advisoryIds(vulnerability: AuditVulnerability): string[] {
  return vulnerability.via
    .filter((entry): entry is AuditViaObject => typeof entry !== 'string')
    .map((entry) => entry.url?.match(GHSA_PATTERN)?.[0])
    .filter((id): id is string => Boolean(id));
}

function dependencyNames(vulnerability: AuditVulnerability): string[] {
  return vulnerability.via.filter((entry): entry is string => typeof entry === 'string');
}

export function evaluateAudit(
  report: AuditReport,
  options: {
    readonly allowlist?: readonly AuditAllowlistEntry[];
    readonly now?: Date;
  } = {},
): AuditEvaluation {
  const allowlist = options.allowlist ?? AUDIT_ALLOWLIST;
  const now = options.now ?? new Date();
  const failures: string[] = [];

  if (report.error) {
    return { ok: false, failures: ['npm audit failed; the gate is fail-closed'], allowed: [] };
  }

  const vulnerabilities = report.vulnerabilities ?? {};
  const active = allowlist.filter((entry) => new Date(`${entry.expires}T23:59:59Z`) >= now);
  const expired = allowlist.filter((entry) => new Date(`${entry.expires}T23:59:59Z`) < now);

  const allowed = new Set<string>();

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if (vulnerability.severity === 'critical') {
      failures.push(`${name} (critical) is never allowlisted`);
      continue;
    }
    if (vulnerability.severity !== 'high') continue;

    const ids = advisoryIds(vulnerability);
    const match = active.find((entry) => entry.package === name && ids.includes(entry.ghsa));
    if (match) {
      allowed.add(name);
      continue;
    }

    const expiredMatch = expired.find(
      (entry) => entry.package === name && ids.includes(entry.ghsa),
    );
    if (expiredMatch) {
      failures.push(
        `${name} (high, ${expiredMatch.ghsa}) exception expired on ${expiredMatch.expires}`,
      );
    }
  }

  // Propagate through transitive entries such as @prisma/config and prisma,
  // which npm reports as high because their children are.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
      if (vulnerability.severity !== 'high' || allowed.has(name)) continue;

      const dependencies = dependencyNames(vulnerability);
      if (dependencies.length > 0 && dependencies.every((dependency) => allowed.has(dependency))) {
        allowed.add(name);
        changed = true;
      }
    }
  }

  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    if (vulnerability.severity !== 'high' || allowed.has(name)) continue;
    if (failures.some((failure) => failure.startsWith(`${name} (`))) continue;

    const ids = advisoryIds(vulnerability);
    failures.push(
      `${name} (high)${ids.length > 0 ? `: ${ids.join(', ')}` : ' has an unallowlisted advisory'}`,
    );
  }

  return { ok: failures.length === 0, failures, allowed: [...allowed].sort() };
}

function main(): void {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  if (!result.stdout) {
    process.stderr.write('audit gate: npm audit produced no output\n');
    process.exit(1);
  }

  let report: AuditReport;
  try {
    report = JSON.parse(result.stdout) as AuditReport;
  } catch {
    process.stderr.write('audit gate: could not parse npm audit output\n');
    process.exit(1);
  }

  const evaluation = evaluateAudit(report);

  if (!evaluation.ok) {
    process.stderr.write('audit gate: failing high/critical advisories\n');
    for (const failure of evaluation.failures) {
      process.stderr.write(`  - ${failure}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(
    `audit gate passed${evaluation.allowed.length > 0 ? `; time-limited exceptions: ${evaluation.allowed.join(', ')}` : ''}\n`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main();
}
