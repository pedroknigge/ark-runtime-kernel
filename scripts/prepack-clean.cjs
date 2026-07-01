#!/usr/bin/env node
/**
 * prepack-clean.cjs
 * Ensures the tree is in full dev state (from package.dev.json), then writes a
 * publish-ready (stripped) package.json in place for the tarball.
 *
 * This provides self-recovery: even if you run `npm pack` when the current
 * package.json is stripped (only 'build', no devDeps), we first heal from
 * package.dev.json.
 *
 * Only the 'build' script is kept in the published manifest inside the tgz.
 * Lifecycle scripts live in the source package.dev.json.
 */
const fs = require('fs');
const path = require('path');

const devPkgPath = path.join(process.cwd(), 'package.dev.json');
const currentPkgPath = path.join(process.cwd(), 'package.json');

if (!fs.existsSync(devPkgPath)) {
  console.error('[prepack-clean] FATAL: package.dev.json not found — cannot produce clean publish manifest or heal tree.');
  process.exit(1);
}

const devPkg = JSON.parse(fs.readFileSync(devPkgPath, 'utf8'));

// === SELF-HEALING STEP ===
// If the current package.json looks stripped (no devDependencies or very few scripts),
// first restore the full dev manifest. This makes the mechanism robust even if
// someone runs `npm pack` from a previously corrupted/stripped tree.
const currentRaw = fs.readFileSync(currentPkgPath, 'utf8');
let current;
try {
  current = JSON.parse(currentRaw);
} catch {
  current = {};
}

const looksStripped = !current.devDependencies || Object.keys(current.devDependencies).length === 0;
if (looksStripped) {
  fs.writeFileSync(currentPkgPath, JSON.stringify(devPkg, null, 2) + '\n');
  console.log('[prepack-clean] Detected stripped package.json — healed from package.dev.json before stripping for publish.');
}

// Re-read after possible heal
const fullForPublish = JSON.parse(fs.readFileSync(currentPkgPath, 'utf8'));

// Create publish shape (strip for the tarball manifest)
// We keep 'build' + the lifecycle hooks so that even the published tarball
// carries the ability to run prepack/postpack if someone unpacks and repacks.
const publishPkg = { ...fullForPublish };
delete publishPkg.devDependencies;

const keepScripts = new Set(['build', 'prepack', 'postpack']);
if (publishPkg.scripts && typeof publishPkg.scripts === 'object') {
  Object.keys(publishPkg.scripts).forEach((key) => {
    if (!keepScripts.has(key)) {
      delete publishPkg.scripts[key];
    }
  });
}

fs.writeFileSync(currentPkgPath, JSON.stringify(publishPkg, null, 2) + '\n');
console.log('[prepack-clean] Wrote clean publish package.json (build + lifecycle hooks) from healed dev manifest.');