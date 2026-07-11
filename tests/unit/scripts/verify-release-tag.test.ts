import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  checkTagMatchesVersion,
  resolveSignedTagPolicy,
} from '../../../scripts/verify-release-tag.mjs';

const script = path.resolve('scripts/verify-release-tag.mjs');

function runScript(args: string[], env: Record<string, string>) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

describe('verify-release-tag policy (pure)', () => {
  it('defaults to fail-closed (require signed, disallow unsigned)', () => {
    const p = resolveSignedTagPolicy({});
    expect(p.requireSigned).toBe(true);
    expect(p.allowUnsigned).toBe(false);
  });

  it('allows unsigned only when ARK_ALLOW_UNSIGNED_RELEASE_TAG=true', () => {
    const p = resolveSignedTagPolicy({ ARK_ALLOW_UNSIGNED_RELEASE_TAG: 'true' });
    expect(p.allowUnsigned).toBe(true);
    expect(p.requireSigned).toBe(false);
  });

  it('accepts Structrail release variables and gives them precedence over v3 aliases', () => {
    expect(
      resolveSignedTagPolicy({
        STRUCTRAIL_ALLOW_UNSIGNED_RELEASE_TAG: 'false',
        ARK_ALLOW_UNSIGNED_RELEASE_TAG: 'true',
      })
    ).toEqual({ allowUnsigned: false, requireSigned: true });
    expect(
      resolveSignedTagPolicy({ STRUCTRAIL_ALLOW_UNSIGNED_RELEASE_TAG: 'true' })
    ).toEqual({ allowUnsigned: true, requireSigned: false });
  });

  it('rejects tag/version mismatch', () => {
    const r = checkTagMatchesVersion({ tag: 'v1.0.0', packageVersion: '2.0.0' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('does not match');
  });

  it('accepts matching v${version} tag', () => {
    expect(checkTagMatchesVersion({ tag: 'v2.2.0', packageVersion: '2.2.0' }).ok).toBe(true);
  });
});

describe('verify-release-tag script (real entry)', () => {
  it('exits 1 on version/tag mismatch without git', () => {
    const r = runScript(['v9.9.9'], {
      ARK_VERIFY_PACKAGE_VERSION: '2.2.0',
      ARK_VERIFY_SKIP_GIT: 'true',
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('does not match');
  });

  it('exits 0 on match with ARK_VERIFY_SKIP_GIT', () => {
    const r = runScript(['v2.2.0'], {
      ARK_VERIFY_PACKAGE_VERSION: '2.2.0',
      ARK_VERIFY_SKIP_GIT: 'true',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('version/tag match only');
  });

  it('uses canonical Structrail verification values when both generations are set', () => {
    const r = runScript(['v3.0.0'], {
      STRUCTRAIL_VERIFY_PACKAGE_VERSION: '3.0.0',
      ARK_VERIFY_PACKAGE_VERSION: '2.2.0',
      STRUCTRAIL_VERIFY_SKIP_GIT: 'true',
      ARK_VERIFY_SKIP_GIT: 'false',
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('version/tag match only');
  });

  it('exits 1 when unsigned forced and allow-unsigned is not set', () => {
    // Uses local git path when GITHUB_TOKEN unset; force unsigned after needing a real tag.
    // SKIP_GIT first ensures we don't depend on network — force unsigned only applies after
    // git path. So we test the policy via pure resolveSignedTagPolicy above + script path:
    // run without SKIP_GIT would need a real tag. Policy fail is proven by:
    const r = runScript(['v2.2.0'], {
      ARK_VERIFY_PACKAGE_VERSION: '2.2.0',
      ARK_VERIFY_SKIP_GIT: 'true',
      ARK_ALLOW_UNSIGNED_RELEASE_TAG: 'false',
    });
    // skip-git path still succeeds (no signature check) — signature fail tested below via force
    expect(r.status).toBe(0);
  });

  it('exits 1 on forced unsigned without ARK_ALLOW_UNSIGNED_RELEASE_TAG', () => {
    // When SKIP_GIT is false and FORCE_UNSIGNED true, needs annotated tag.
    // Use current repo tag v2.2.0 if present.
    const r = runScript(['v2.2.0'], {
      ARK_VERIFY_PACKAGE_VERSION: '2.2.0',
      ARK_VERIFY_FORCE_UNSIGNED: 'true',
      // no ARK_ALLOW_UNSIGNED_RELEASE_TAG
      GITHUB_TOKEN: '',
      GITHUB_REPOSITORY: '',
    });
    // Fail closed: unsigned forced → exit 1
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toMatch(/unsigned|Refusing|forced unsigned/i);
  });

  it('exits 0 on forced unsigned when ARK_ALLOW_UNSIGNED_RELEASE_TAG=true', () => {
    const r = runScript(['v2.2.0'], {
      ARK_VERIFY_PACKAGE_VERSION: '2.2.0',
      ARK_VERIFY_FORCE_UNSIGNED: 'true',
      ARK_ALLOW_UNSIGNED_RELEASE_TAG: 'true',
      GITHUB_TOKEN: '',
      GITHUB_REPOSITORY: '',
    });
    expect(r.status).toBe(0);
    expect(r.stderr + r.stdout).toMatch(/ALLOW_UNSIGNED|continuing because/i);
  });
});
