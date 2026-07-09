/**
 * Integration: ark-check flags cross-slice imports under peerIsolation.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CHECK = path.join(repoRoot, 'bin/ark-check.mjs');

function writeTree(root: string, files: Record<string, string>) {
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body, 'utf8');
  }
}

function runCheck(root: string): {
  code: number;
  report: { violations: Array<{ ruleId: string; peerIsolation?: boolean }> };
} {
  try {
    const stdout = execFileSync(
      process.execPath,
      [CHECK, '--root', root, '--config', 'ark.config.json', '--json', '--no-cache'],
      { encoding: 'utf8', cwd: root }
    );
    return { code: 0, report: JSON.parse(stdout) };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string };
    const stdout = String(e.stdout ?? '');
    return { code: e.status ?? 1, report: JSON.parse(stdout) };
  }
}

const configBody = JSON.stringify(
  {
    include: ['src'],
    layers: [
      { name: 'Features', patterns: ['src/features/**'], optional: true },
      { name: 'Shared', patterns: ['src/shared/**'], optional: true },
    ],
    rules: [
      {
        from: 'Features',
        to: 'Features',
        allowed: false,
        peerIsolation: true,
      },
    ],
  },
  null,
  2
);

const tsconfigBody = JSON.stringify({
  compilerOptions: { module: 'ESNext', moduleResolution: 'bundler', strict: true },
  include: ['src'],
});

describe('peerIsolation via ark-check', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ark-peer-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('reports LAYER_IMPORT_VIOLATION for cross-slice feature import', () => {
    writeTree(tmp, {
      'ark.config.json': configBody,
      'tsconfig.json': tsconfigBody,
      'src/features/auth/api.ts': `import { charge } from '../payments/charge';\nexport const login = () => charge();\n`,
      'src/features/payments/charge.ts': `export function charge() { return 1; }\n`,
      'src/shared/util.ts': `export const id = () => 'x';\n`,
    });

    const { code, report } = runCheck(tmp);
    expect(code).not.toBe(0);
    const hits = report.violations.filter((v) => v.ruleId === 'LAYER_IMPORT_VIOLATION');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((v) => v.peerIsolation === true)).toBe(true);
  });

  it('allows same-slice import and feature→shared', () => {
    writeTree(tmp, {
      'ark.config.json': configBody,
      'tsconfig.json': tsconfigBody,
      'src/features/auth/api.ts': `import { token } from './token';\nimport { id } from '../../shared/util';\nexport const login = () => token() + id();\n`,
      'src/features/auth/token.ts': `export function token() { return 't'; }\n`,
      'src/shared/util.ts': `export const id = () => 'x';\n`,
    });

    const { code, report } = runCheck(tmp);
    expect(code).toBe(0);
    expect(report.violations.filter((v) => v.ruleId === 'LAYER_IMPORT_VIOLATION')).toHaveLength(0);
  });
});
