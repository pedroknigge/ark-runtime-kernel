import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHECK = path.resolve('bin/ark-check.mjs');
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function project(content: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ark-y08-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'src/domain'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'ark.config.json'),
    JSON.stringify({
      include: ['src'],
      layers: [
        {
          name: 'DomainModel',
          patterns: ['src/domain/**'],
          forbiddenGlobals: ['process'],
          capabilities: { deny: ['process'] },
        },
      ],
      rules: [],
    })
  );
  fs.writeFileSync(path.join(root, 'src/domain/process.ts'), content);
  return root;
}

function check(root: string) {
  const result = spawnSync(
    process.execPath,
    [CHECK, '--root', root, '--config', 'ark.config.json', '--json'],
    { cwd: root, encoding: 'utf8' }
  );
  return {
    status: result.status,
    payload: JSON.parse(result.stdout || '{}') as {
      ok: boolean;
      violations: Array<{
        ruleId: string;
        file?: string;
        target?: string;
        edgeKind?: string;
      }>;
    },
  };
}

describe('Y08 process forbidden-global module dual', () => {
  it('blocks node:process once and ignores a poisoned pre-Y08 cache finding', () => {
    const root = project(
      "import process from 'node:process';\nexport const cwd = process.cwd();\n"
    );

    const cachePath = path.join(root, 'node_modules/.cache/ark-check.json');
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        key: 'pre-y08-poisoned',
        files: {
          'src/domain/process.ts': {
            contentViolations: [
              {
                ruleId: 'CAPABILITY_VIOLATION',
                file: 'src/domain/process.ts',
                line: 99,
                target: 'node:process',
                message: 'pre-Y08 cached wall finding',
              },
            ],
          },
        },
      })
    );

    const cold = check(root);
    expect(cold.status).toBe(1);
    expect(cold.payload.violations).toEqual([
      expect.objectContaining({
        ruleId: 'FORBIDDEN_GLOBAL',
        file: 'src/domain/process.ts',
        target: 'node:process',
        edgeKind: 'import',
      }),
    ]);

    const warm = check(root);
    expect(warm.status).toBe(1);
    expect(warm.payload.violations).toEqual([
      expect.objectContaining({
        ruleId: 'FORBIDDEN_GLOBAL',
        target: 'node:process',
        edgeKind: 'import',
      }),
    ]);
  });

  it('does not turn a type-only node:process import into runtime evidence', () => {
    const root = project(
      "import type process from 'node:process';\nimport type ProcessType = require('node:process');\nexport type Process = typeof process | ProcessType;\n"
    );
    const result = check(root);
    expect(result.status).toBe(0);
    expect(result.payload.ok).toBe(true);
    expect(result.payload.violations).toEqual([]);
  });
});
