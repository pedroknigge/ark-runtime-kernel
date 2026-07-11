import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { detectWritePathCapabilities } from '../../../bin/lib/write-path-detect.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARK_CHECK = path.join(REPO, 'bin', 'ark-check.mjs');

function mk(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ark-host-cap-'));
}

function write(root: string, relativePath: string, content: string): void {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeMergeGate(root: string): void {
  write(
    root,
    '.github/workflows/ark-check.yml',
    'name: Ark\njobs:\n  architecture:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run check:architecture\n'
  );
}

function writeHook(root: string, host: 'claude' | 'grok', repair = true): void {
  const relativePath =
    host === 'claude'
      ? '.claude/settings.json'
      : '.grok/hooks/ark-write-gate.json';
  write(
    root,
    relativePath,
    `command: npx arkgate-mcp --hook${repair ? ' --hook-repair' : ''} --root .\n`
  );
}

function writeMcp(root: string, host: 'claude' | 'grok' | 'cursor' | 'codex'): void {
  if (host === 'claude') {
    write(root, '.mcp.json', '{"mcpServers":{"ark":{"command":"npx","args":["arkgate-mcp"]}}}');
    return;
  }
  if (host === 'grok') {
    write(root, '.grok/config.toml', '[mcp_servers.ark]\ncommand = "npx"\nargs = ["arkgate-mcp"]\n');
    return;
  }
  if (host === 'cursor') {
    write(root, '.cursor/mcp.json', '{"mcpServers":{"ark":{"command":"npx","args":["arkgate-mcp"]}}}');
    return;
  }
  write(
    root,
    '.codex-home/config.toml',
    `[mcp_servers.ark]\ncommand = "npx"\nargs = ["arkgate-mcp", "--root", "${root}", "--config", "ark.config.json"]\n`
  );
}

function project(result: ReturnType<typeof detectWritePathCapabilities>) {
  const activeInventory = result.inventory.hosts[result.activeHost];
  return {
    activeHost: result.activeHost,
    mode: result.mode,
    capabilities: result.capabilities,
    capabilityEvidence: result.capabilityEvidence,
    inventoryCapabilities: result.inventory.capabilities,
    activeInventory: activeInventory
      ? {
          configured: activeInventory.configured,
          capabilities: activeInventory.capabilities,
        }
      : null,
  };
}

function withCodexHome<T>(root: string, run: () => T): T {
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = path.join(root, '.codex-home');
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
  }
}

describe('active-host write capability model', () => {
  it('keeps stable host-only and unknown JSON snapshots', () => {
    const snapshots: Record<string, unknown> = {};
    for (const host of ['claude', 'grok', 'cursor', 'codex', 'unknown'] as const) {
      const root = mk();
      try {
        writeMergeGate(root);
        if (host === 'claude' || host === 'grok') writeHook(root, host);
        if (host !== 'unknown') writeMcp(root, host);
        if (host === 'unknown') {
          writeHook(root, 'claude');
          writeMcp(root, 'cursor');
        }
        snapshots[host] = withCodexHome(root, () =>
          project(detectWritePathCapabilities(root, host))
        );
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }

    expect(snapshots).toMatchInlineSnapshot(`
      {
        "claude": {
          "activeHost": "claude",
          "activeInventory": {
            "capabilities": {
              "advisory-write": true,
              "hard-write": true,
              "merge-gate": true,
              "repair-payload": true,
            },
            "configured": true,
          },
          "capabilities": {
            "advisory-write": true,
            "hard-write": true,
            "merge-gate": true,
            "repair-payload": true,
          },
          "capabilityEvidence": {
            "advisory-write": [
              ".mcp.json",
            ],
            "hard-write": [
              ".claude/settings.json",
            ],
            "merge-gate": [
              ".github/workflows/ark-check.yml",
            ],
            "repair-payload": [
              ".claude/settings.json",
            ],
          },
          "inventoryCapabilities": {
            "advisory-write": true,
            "hard-write": true,
            "merge-gate": true,
            "repair-payload": true,
          },
          "mode": "repair",
        },
        "codex": {
          "activeHost": "codex",
          "activeInventory": {
            "capabilities": {
              "advisory-write": true,
              "hard-write": false,
              "merge-gate": true,
              "repair-payload": false,
            },
            "configured": true,
          },
          "capabilities": {
            "advisory-write": true,
            "hard-write": false,
            "merge-gate": true,
            "repair-payload": false,
          },
          "capabilityEvidence": {
            "advisory-write": [
              ".codex-home/config.toml",
            ],
            "hard-write": [],
            "merge-gate": [
              ".github/workflows/ark-check.yml",
            ],
            "repair-payload": [],
          },
          "inventoryCapabilities": {
            "advisory-write": true,
            "hard-write": false,
            "merge-gate": true,
            "repair-payload": false,
          },
          "mode": "mcp-only",
        },
        "cursor": {
          "activeHost": "cursor",
          "activeInventory": {
            "capabilities": {
              "advisory-write": true,
              "hard-write": false,
              "merge-gate": true,
              "repair-payload": false,
            },
            "configured": true,
          },
          "capabilities": {
            "advisory-write": true,
            "hard-write": false,
            "merge-gate": true,
            "repair-payload": false,
          },
          "capabilityEvidence": {
            "advisory-write": [
              ".cursor/mcp.json",
            ],
            "hard-write": [],
            "merge-gate": [
              ".github/workflows/ark-check.yml",
            ],
            "repair-payload": [],
          },
          "inventoryCapabilities": {
            "advisory-write": true,
            "hard-write": false,
            "merge-gate": true,
            "repair-payload": false,
          },
          "mode": "mcp-only",
        },
        "grok": {
          "activeHost": "grok",
          "activeInventory": {
            "capabilities": {
              "advisory-write": true,
              "hard-write": true,
              "merge-gate": true,
              "repair-payload": true,
            },
            "configured": true,
          },
          "capabilities": {
            "advisory-write": true,
            "hard-write": true,
            "merge-gate": true,
            "repair-payload": true,
          },
          "capabilityEvidence": {
            "advisory-write": [
              ".grok/config.toml",
            ],
            "hard-write": [
              ".grok/hooks/ark-write-gate.json",
            ],
            "merge-gate": [
              ".github/workflows/ark-check.yml",
            ],
            "repair-payload": [
              ".grok/hooks/ark-write-gate.json",
            ],
          },
          "inventoryCapabilities": {
            "advisory-write": true,
            "hard-write": true,
            "merge-gate": true,
            "repair-payload": true,
          },
          "mode": "repair",
        },
        "unknown": {
          "activeHost": "unknown",
          "activeInventory": null,
          "capabilities": {
            "advisory-write": false,
            "hard-write": false,
            "merge-gate": true,
            "repair-payload": false,
          },
          "capabilityEvidence": {
            "advisory-write": [],
            "hard-write": [],
            "merge-gate": [
              ".github/workflows/ark-check.yml",
            ],
            "repair-payload": [],
          },
          "inventoryCapabilities": {
            "advisory-write": true,
            "hard-write": true,
            "merge-gate": true,
            "repair-payload": true,
          },
          "mode": "none",
        },
      }
    `);
  });

  it('does not inherit Grok hard-write or repair guarantees in a mixed Codex repo', () => {
    const root = mk();
    try {
      writeMergeGate(root);
      writeHook(root, 'grok');
      writeMcp(root, 'grok');
      writeMcp(root, 'cursor');

      const result = withCodexHome(root, () =>
        detectWritePathCapabilities(root, 'codex')
      );

      expect(result.activeHost).toBe('codex');
      expect(result.capabilities).toEqual({
        'hard-write': false,
        'advisory-write': false,
        'merge-gate': true,
        'repair-payload': false,
      });
      expect(result.inventory.hosts.grok.capabilities).toMatchObject({
        'hard-write': true,
        'repair-payload': true,
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports active-host capabilities in doctor JSON and human output', () => {
    const root = mk();
    try {
      writeMergeGate(root);
      writeHook(root, 'grok');
      writeMcp(root, 'grok');
      writeMcp(root, 'cursor');
      write(root, 'AGENTS.md', '# ArkGate Enforcement\n');
      write(root, 'src/domain/value.ts', 'export const value = 1;\n');
      write(
        root,
        'ark.config.json',
        JSON.stringify({
          include: ['src'],
          layers: [{ name: 'DomainModel', patterns: ['src/domain/**'] }],
          rules: [],
        })
      );

      const env = {
        ...process.env,
        CODEX_HOME: path.join(root, '.codex-home'),
        ARK_ACTIVE_HOST: 'codex',
      };
      const jsonRun = spawnSync(
        process.execPath,
        [ARK_CHECK, '--root', root, '--config', 'ark.config.json', '--doctor', '--json', '--no-cache'],
        { cwd: REPO, env, encoding: 'utf8' }
      );
      expect(jsonRun.status).toBe(0);
      const payload = JSON.parse(jsonRun.stdout);
      expect(payload.doctor.writePath.activeHost).toBe('codex');
      expect(payload.doctor.writePath.capabilities['hard-write']).toBe(false);
      expect(payload.doctor.writePath.capabilities['repair-payload']).toBe(false);
      expect(payload.doctor.writePath.inventory.hosts.grok.capabilities['hard-write']).toBe(true);

      const humanRun = spawnSync(
        process.execPath,
        [ARK_CHECK, '--root', root, '--config', 'ark.config.json', '--doctor', '--no-cache'],
        {
          cwd: REPO,
          env: { ...env, ARK_ACTIVE_HOST: 'cursor' },
          encoding: 'utf8',
        }
      );
      expect(humanRun.status).toBe(0);
      expect(humanRun.stdout).toContain('Active host: cursor');
      expect(humanRun.stdout).toContain('Hard write boundary: no');
      expect(humanRun.stdout).toContain('Advisory write tools (MCP): yes');
      expect(humanRun.stdout).toContain('Merge gate (CI): yes');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
