import { describe, expect, it } from 'vitest';
import {
  evaluateAudit,
  type AuditAllowlistEntry,
  type AuditReport,
  type AuditVulnerability,
} from '../../scripts/audit-gate.js';

const allowlist: readonly AuditAllowlistEntry[] = [
  {
    package: 'deepmerge-ts',
    ghsa: 'GHSA-ggr8-5vv4-36mx',
    reason: 'test',
    expires: '2030-01-01',
  },
  {
    package: 'effect',
    ghsa: 'GHSA-7589-6fvf-x4pw',
    reason: 'test',
    expires: '2030-01-01',
  },
];

function report(vulnerabilities: Record<string, AuditVulnerability>): AuditReport {
  return { vulnerabilities };
}

const prismaChain = report({
  '@prisma/config': { severity: 'high', via: ['deepmerge-ts', 'effect'] },
  prisma: { severity: 'high', via: ['@prisma/config'] },
  'deepmerge-ts': {
    severity: 'high',
    via: [{ url: 'https://github.com/advisories/GHSA-ggr8-5vv4-36mx' }],
  },
  effect: {
    severity: 'high',
    via: [{ url: 'https://github.com/advisories/GHSA-7589-6fvf-x4pw' }],
  },
});

describe('evaluateAudit', () => {
  it('passes when every high advisory is exactly allowlisted, including transitive parents', () => {
    const result = evaluateAudit(prismaChain, { allowlist });

    expect(result.ok).toBe(true);
    expect(result.allowed).toEqual(['@prisma/config', 'deepmerge-ts', 'effect', 'prisma']);
  });

  it('fails on a new high advisory that is not allowlisted', () => {
    const result = evaluateAudit(
      report({
        'left-pad': {
          severity: 'high',
          via: [{ url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc' }],
        },
      }),
      { allowlist },
    );

    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toContain('left-pad');
    expect(result.failures.join(' ')).toContain('GHSA-aaaa-bbbb-cccc');
  });

  it('fails when the allowlist entry names a different advisory', () => {
    const result = evaluateAudit(
      report({
        'deepmerge-ts': {
          severity: 'high',
          via: [{ url: 'https://github.com/advisories/GHSA-zzzz-yyyy-xxxx' }],
        },
      }),
      { allowlist },
    );

    expect(result.ok).toBe(false);
  });

  it('fails once an exception expires', () => {
    const result = evaluateAudit(prismaChain, {
      allowlist,
      now: new Date('2030-01-02T00:00:00Z'),
    });

    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toContain('expired');
  });

  it('never allowlists critical advisories', () => {
    const result = evaluateAudit(
      report({
        'deepmerge-ts': { severity: 'critical', via: ['nested-legacy-package'] },
      }),
      { allowlist },
    );

    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toContain('critical');
  });

  it('ignores moderate and low advisories', () => {
    const result = evaluateAudit(report({ something: { severity: 'moderate', via: ['x'] } }), {
      allowlist,
    });

    expect(result.ok).toBe(true);
  });

  it('fails closed when npm audit itself errors', () => {
    const result = evaluateAudit({ error: { code: 'ENETUNREACH' } }, { allowlist });

    expect(result.ok).toBe(false);
  });
});
