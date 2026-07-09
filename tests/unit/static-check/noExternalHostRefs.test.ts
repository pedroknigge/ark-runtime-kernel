/**
 * Guard: shipped arkgate tree must not encode named external probe hosts/repos.
 * Generic frameworks (Nest, Next) and first-party product URLs remain allowed.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Tokens that identify one-off field-probe hosts (not generic frameworks). */
const FORBIDDEN = [
  'meiridan',
  'house-proposal',
  'dcouplr',
  'deer-flow',
  'deer_flow',
  'deerflow',
];

const RG_GLOBS = [
  '!node_modules/**',
  '!dist/**',
  '!.git/**',
  '!**/.cache/**',
  '!**/coverage/**',
  // This file documents the forbidden list — exclude self from match noise on pattern text.
  '!tests/unit/static-check/noExternalHostRefs.test.ts',
];

describe('no external field-probe host identity in shipped tree', () => {
  it('ripgrep finds zero matches for forbidden host tokens', () => {
    const pattern = FORBIDDEN.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const args = ['-n', '-i', '--hidden', pattern, REPO, ...RG_GLOBS.flatMap((g) => ['--glob', g])];
    const res = spawnSync('rg', args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    // rg exit 1 = no matches (success for us); 0 = matches found; 2 = error
    if (res.status === 2 || res.error) {
      // Fallback walk if rg missing
      if (res.error && (res.error as NodeJS.ErrnoException).code === 'ENOENT') {
        const hits = walkForTokens(REPO, FORBIDDEN);
        expect(hits, hits.join('\n')).toEqual([]);
        return;
      }
      throw new Error(`rg failed: ${res.stderr || res.error}`);
    }
    const hits = (res.stdout || '')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    expect(hits, hits.slice(0, 20).join('\n')).toEqual([]);
    expect(res.status).toBe(1);
  });
});

function walkForTokens(root: string, tokens: string[]): string[] {
  const hits: string[] = [];
  const skip = new Set(['node_modules', 'dist', '.git', '.cache', 'coverage']);
  const lowerTokens = tokens.map((t) => t.toLowerCase());
  function walk(dir: string) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(ent.name)) continue;
      if (ent.name === 'noExternalHostRefs.test.ts') continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile()) {
        let text: string;
        try {
          text = fs.readFileSync(full, 'utf8');
        } catch {
          continue;
        }
        const lower = text.toLowerCase();
        for (const t of lowerTokens) {
          if (lower.includes(t)) hits.push(`${path.relative(root, full)}: contains ${t}`);
        }
      }
    }
  }
  walk(root);
  return hits;
}
