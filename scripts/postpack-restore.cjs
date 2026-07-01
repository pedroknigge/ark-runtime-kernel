#!/usr/bin/env node
/**
 * postpack-restore.cjs
 * Always restores the full development package.json from the committed
 * package.dev.json. No backup file is used.
 * This script is invoked by npm postpack lifecycle (or manually).
 * It is designed to be robust and succeed even if the current package.json
 * is in a stripped state.
 */
const fs = require('fs');
const path = require('path');

const devPkgPath = path.join(process.cwd(), 'package.dev.json');
const currentPkgPath = path.join(process.cwd(), 'package.json');

if (!fs.existsSync(devPkgPath)) {
  console.error('[postpack-restore] FATAL: package.dev.json not found — cannot restore dev manifest. The tree may be in a corrupted state.');
  process.exit(1);
}

try {
  const devContent = fs.readFileSync(devPkgPath, 'utf8');
  fs.writeFileSync(currentPkgPath, devContent);

  // Verify restore succeeded (prevents silent corruption)
  const restored = JSON.parse(fs.readFileSync(currentPkgPath, 'utf8'));
  if (!restored.devDependencies || Object.keys(restored.devDependencies).length === 0) {
    console.error('[postpack-restore] FATAL: restore did not bring back devDependencies');
    process.exit(1);
  }

  console.log('[postpack-restore] package.json restored from package.dev.json');
} catch (err) {
  console.error('[postpack-restore] FATAL error during restore:', err.message);
  process.exit(1);
}