import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '../../..');
const ARK_CHECK = path.join(REPO, 'bin/ark-check.mjs');
const EXAMPLES = path.join(REPO, 'examples');

const GALLERY_STARTERS = [
  { dir: 'crud-product-starter', archetype: 'crud-product' },
  { dir: 'api-backend-starter', archetype: 'api-backend' },
  { dir: 'worker-pipeline-starter', archetype: 'worker-pipeline' },
  { dir: 'multi-app-workspace-starter', archetype: 'multi-app-workspace' },
] as const;

type CheckJson = { ok: boolean; violations: unknown[]; warnings: unknown[] };

function runStrictCheck(root: string): CheckJson {
  const stdout = execFileSync(
    'node',
    [ARK_CHECK, '--root', root, '--config', 'ark.config.json', '--strict-config', '--json'],
    { encoding: 'utf8' }
  );
  return JSON.parse(stdout) as CheckJson;
}

describe('Phase D — example gallery starters', () => {
  for (const starter of GALLERY_STARTERS) {
    it(`${starter.dir} passes ark-check --strict-config`, () => {
      const root = path.join(EXAMPLES, starter.dir);
      expect(fs.existsSync(path.join(root, 'ark.config.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'README.md'))).toBe(true);

      const result = runStrictCheck(root);
      expect(result.ok).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  }

  it('gallery README indexes every starter archetype', () => {
    const readme = fs.readFileSync(path.join(EXAMPLES, 'README.md'), 'utf8');
    for (const starter of GALLERY_STARTERS) {
      expect(readme).toContain(starter.dir);
      expect(readme).toContain(starter.archetype);
    }
    expect(readme).toContain('hexagonal-order-api');
    expect(readme).toContain('basic/');
  });
});