#!/usr/bin/env node
/**
 * scripts/run-publish-smoke.mjs
 *
 * Committed automation for Verification plan step 2.
 * - packs the library to {SCRATCH}
 * - creates a fresh temp dir
 * - npm installs the tgz
 * - compiles and runs examples/publish-smoke/consumer.ts
 * - writes stdout to {SCRATCH}/consumer-run.log (and consumer-run2.log on repeat)
 *
 * Usage:
 *   node scripts/run-publish-smoke.mjs
 *   node scripts/run-publish-smoke.mjs --repeat
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SCRATCH = process.env.SCRATCH
  ? path.resolve(process.env.SCRATCH)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'ark-publish-smoke-'));
const root = process.cwd();
process.env.SCRATCH = SCRATCH;

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: 'pipe', encoding: 'utf8', ...opts });
}

function quote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function logTo(file, content) {
  fs.mkdirSync(SCRATCH, { recursive: true });
  fs.writeFileSync(file, content);
  console.log('Wrote', file);
}

const repeat = process.argv.includes('--repeat');
const logName = repeat ? 'consumer-run2.log' : 'consumer-run.log';
const logPath = path.join(SCRATCH, logName);

console.log('[run-publish-smoke] packing...');
run(`npm pack --pack-destination ${quote(SCRATCH)} --silent`);

const files = fs.readdirSync(SCRATCH).filter(f => f.endsWith('.tgz'));
if (files.length === 0) throw new Error('No tgz found after pack');
const tgz = path.join(SCRATCH, files[0]);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ark-smoke-'));
console.log('[run-publish-smoke] installing into', tmp);
run('npm init -y', { cwd: tmp, stdio: 'inherit' });
run(`npm install ${quote(tgz)} typescript @types/node`, { cwd: tmp, stdio: 'inherit' });

// Copy the committed consumer
const consumerSrc = path.join(root, 'examples/publish-smoke/consumer.ts');
const consumerDst = path.join(tmp, 'consumer.ts');
fs.copyFileSync(consumerSrc, consumerDst);

// tsconfig for the smoke
fs.writeFileSync(path.join(tmp, 'tsconfig.json'), JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    strict: true,
    outDir: './dist',
    rootDir: '.'
  },
  include: ['consumer.ts']
}, null, 2));

// Set type module
const pkgPath = path.join(tmp, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.type = 'module';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

console.log('[run-publish-smoke] compiling and running...');
run('npx tsc', { cwd: tmp, stdio: 'inherit' });
const output = run('node dist/consumer.js', { cwd: tmp, encoding: 'utf8' });

logTo(logPath, output);
console.log('[run-publish-smoke] done. Output written to', logPath);

if (!repeat) {
  // also run repeat for convenience
  console.log('[run-publish-smoke] running repeat for consumer-run2.log ...');
  run(`node ${quote(path.join(root, 'scripts/run-publish-smoke.mjs'))} --repeat`);
}
