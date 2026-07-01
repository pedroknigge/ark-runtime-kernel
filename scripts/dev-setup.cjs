#!/usr/bin/env node
/**
 * dev-setup.cjs
 * Copies package.dev.json to package.json so dev commands see full devDependencies and scripts.
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
console.log('Dev manifest activated (package.json = package.dev.json)');