#!/usr/bin/env node
/**
 * dev-teardown.cjs
 * Restores package.json from package.dev.json after build/test hooks.
 * Keeps the checked-in dev workflow intact (npm test / npm run typecheck always work).
 */
const fs = require('fs');
const path = require('path');

const dev = path.join(process.cwd(), 'package.dev.json');
const target = path.join(process.cwd(), 'package.json');

if (!fs.existsSync(dev)) {
  console.error('package.dev.json not found');
  process.exit(1);
}

fs.copyFileSync(dev, target);
console.log('Dev manifest restored (package.json = package.dev.json)');