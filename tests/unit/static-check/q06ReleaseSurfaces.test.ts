/**
 * Q06 — release surface parity for Phase Q (3.0.3).
 * Structural checks on shipped docs + version metadata (no re-implementation).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { version } from '../../../src/version.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel: string) {
  return fs.readFileSync(path.join(REPO, rel), 'utf8');
}

describe('Q06 version bump 3.0.3', () => {
  it('package metadata matches src/version', () => {
    expect(version).toBe('3.0.3');
    const pkg = JSON.parse(read('package.json'));
    const lock = JSON.parse(read('package-lock.json'));
    const server = JSON.parse(read('server.json'));
    expect(pkg.version).toBe('3.0.3');
    expect(lock.version).toBe('3.0.3');
    expect(lock.packages[''].version).toBe('3.0.3');
    expect(server.version).toBe('3.0.3');
    expect(server.packages[0].version).toBe('3.0.3');
  });
});

describe('Q06 CHANGELOG + release note cover Q01–Q05', () => {
  it('CHANGELOG 3.0.3 section names Phase Q surfaces', () => {
    const body = read('CHANGELOG.md');
    expect(body).toMatch(/## 3\.0\.3/);
    expect(body).toMatch(/Post-green path \(Q01\)/i);
    expect(body).toMatch(/Smell outcomes \(Q02\)/i);
    expect(body).toMatch(/Golden pattern \(Q03\)/i);
    expect(body).toMatch(/Pilot loop \(Q04\)/i);
    expect(body).toMatch(/AI-velocity eval \(Q05\)/i);
    expect(body).toMatch(/never clears design-weak|neverMechanicalSafe|never mechanical-safe/i);
  });

  it('docs/releases/3.0.3.md has upgrade path and honesty', () => {
    const body = read('docs/releases/3.0.3.md');
    expect(body).toMatch(/arkgate@3\.0\.3/);
    expect(body).toMatch(/npm install -D arkgate@3\.0\.3/);
    expect(body).toMatch(/postGreenPath|clarify-for-ai/);
    expect(body).toMatch(/golden-pattern\.json|goldenPattern/);
    expect(body).toMatch(/pilotLoop/);
    expect(body).toMatch(/eval:ai-velocity/);
    expect(body).toMatch(/never clears design-weak|does \*\*not\*\* ENFORCE|neverMechanicalSafe/i);
    expect(body).not.toMatch(/golden clears design-weak|weakens the gate/i);
  });
});

describe('Q06 package-surface + agent-guide parity', () => {
  it('package-surface documents Q01–Q05 additive fields', () => {
    const body = read('docs/package-surface.md');
    expect(body).toMatch(/postGreenPath|Post-green path \(Q01\)/);
    expect(body).toMatch(/outcome.*Q02|plain-language \*\*`outcome`\*\* \(Q02\)/);
    expect(body).toMatch(/Golden pattern \(Q03\)|goldenPattern/);
    expect(body).toMatch(/Pilot loop \(Q04\)|pilotLoop/);
    expect(body).toMatch(/AI-velocity eval \(Q05\)|eval:ai-velocity/);
  });

  it('agent-guide documents the same consumer path', () => {
    const body = read('docs/agent-guide.md');
    expect(body).toMatch(/Post-green path \(Q01\)|postGreenPath|clarify-for-ai/);
    expect(body).toMatch(/outcome/);
    expect(body).toMatch(/Golden pattern|golden-pattern\.json|goldenPattern/);
    expect(body).toMatch(/Pilot loop \(Q04\)|pilotLoop/);
    expect(body).toMatch(/eval:ai-velocity|AI-velocity/);
  });
});
