#!/usr/bin/env node
/**
 * scripts/release-npm.mjs
 *
 * One-command npm release: verify → build → swap in the minimal publish manifest →
 * npm publish → ALWAYS restore the dev manifest (even when publish fails).
 *
 * Prerequisites: npm login (whoami is checked first so failures happen before any swap).
 *
 * Usage:
 *   npm run release:npm             # real publish
 *   npm run release:npm -- --dry    # everything except the actual publish
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dry = process.argv.includes('--dry');

function run(cmd) {
  console.log(`[release-npm] ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

if (!dry) {
  try {
    execSync('npm whoami', { cwd: root, stdio: 'pipe' });
  } catch {
    console.error('[release-npm] not logged in to npm. Run "npm login" first.');
    process.exit(1);
  }
}

const devManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.dev.json'), 'utf8'));
const publishManifest = JSON.parse(
  fs.readFileSync(path.join(root, 'package.publish.json'), 'utf8')
);
if (devManifest.version !== publishManifest.version) {
  console.error(
    `[release-npm] version mismatch: package.dev.json=${devManifest.version} package.publish.json=${publishManifest.version}. Align them first.`
  );
  process.exit(1);
}

run('npm run typecheck');
run('npx vitest run');
run('npm run check:architecture');
run('npm run build');

fs.copyFileSync(path.join(root, 'package.publish.json'), path.join(root, 'package.json'));
console.log('[release-npm] publish manifest activated');
try {
  run(dry ? 'npm publish --dry-run' : 'npm publish');
} finally {
  fs.copyFileSync(path.join(root, 'package.dev.json'), path.join(root, 'package.json'));
  console.log('[release-npm] dev manifest restored');
}

console.log(
  dry
    ? '[release-npm] dry run complete.'
    : `[release-npm] published ${publishManifest.name}@${publishManifest.version}`
);
