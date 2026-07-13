import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARK = path.join(REPO, 'bin', 'ark.mjs');
const ARK_CHECK = path.join(REPO, 'bin', 'ark-check.mjs');
const roots: string[] = [];

function run(file: string, args: string[], root: string) {
  return spawnSync(process.execPath, [file, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ARK_ACTIVE_HOST: 'claude', CODEX_HOME: path.join(root, '.codex-home') },
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe('B01 library start adoption', () => {
  it('governs a root JavaScript package entrypoint without treating it as a monorepo', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ark-b01-library-'));
    roots.push(root);
    fs.writeFileSync(
      path.join(root, 'package.json'),
      JSON.stringify({ name: 'queue', type: 'module', exports: './index.js' })
    );
    fs.writeFileSync(path.join(root, 'index.js'), 'export const queue = [];\n');
    fs.writeFileSync(path.join(root, 'test.js'), 'import { queue } from "./index.js";\n');

    const preview = run(ARK, ['start', '--root', root, '--tools', 'claude', '--yes', '--no-install', '--json'], root);
    expect(preview.status, `${preview.stdout}\n${preview.stderr}`).toBe(0);
    const result = JSON.parse(preview.stdout) as { projectedCoverage: { percent: number } };
    expect(result.projectedCoverage.percent).toBe(100);

    const applied = run(ARK, ['start', '--root', root, '--tools', 'claude', '--yes', '--no-install', '--apply', '--json'], root);
    expect(applied.status, `${applied.stdout}\n${applied.stderr}`).toBe(0);
    const config = JSON.parse(fs.readFileSync(path.join(root, 'ark.config.json'), 'utf8')) as { include: string[]; frameworkOverlay: string };
    expect(config.include).toContain('.');
    expect(config.frameworkOverlay).toBe('library');

    const strict = run(ARK_CHECK, ['--root', root, '--strict-merge'], root);
    expect(strict.status, `${strict.stdout}\n${strict.stderr}`).toBe(0);
  });
});
