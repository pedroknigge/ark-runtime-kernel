import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { arkCommand, buildArchitectureRecommendation } from '../ark-shared.mjs';

function treeFiles(root) {
  const files = new Map();
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['.git', 'node_modules', 'dist', 'coverage'].includes(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        files.set(path.relative(root, absolute).split(path.sep).join('/'), fs.readFileSync(absolute));
      }
    }
  };
  visit(root);
  return files;
}

function normalizedContent(content, shadowRoot, root) {
  if (!content) return content;
  const text = content.toString('utf8');
  return text.includes('\u0000') ? content : Buffer.from(text.split(shadowRoot).join(root));
}

function digest(content) {
  return `sha256:${crypto.createHash('sha256').update(content ?? Buffer.alloc(0)).digest('hex')}`;
}

function commands(root, args, helpers) {
  const result = [];
  if (args.install !== false && fs.existsSync(path.join(root, 'package.json'))) {
    const [command, commandArgs] = helpers.packageInstallArgv(root, `^${helpers.cliVersion()}`);
    result.push(`${command} ${commandArgs.join(' ')}`);
  }
  result.push(arkCommand(root, 'ark-check', '--init'));
  result.push(arkCommand(root, 'ark-check', '--report ark-report.html'));
  result.push(arkCommand(root, 'ark-check', '--install-agent-gates'));
  result.push(arkCommand(root, 'ark-check', '--plan --json'));
  result.push(arkCommand(root, 'ark-check', '--coverage --json'));
  return result;
}

export function renderStartPreview(preview) {
  console.log('Ark start preview — no files were changed.');
  if (preview.analysis) {
    console.log(`Your project looks like: ${preview.analysis.label} (${preview.analysis.archetype}, confidence ${preview.analysis.confidence}).`);
  }
  console.log(`Projected governed coverage: ${preview.projectedCoverage.percent ?? 'unknown'}% (${preview.projectedCoverage.classifiedFiles}/${preview.projectedCoverage.totalFiles} files)`);
  console.log('Files to create/edit/delete:');
  if (preview.changes.length === 0) console.log('  (none)');
  for (const change of preview.changes) {
    console.log(`  ${change.action.padEnd(6)} ${change.path}  ${change.afterHash ?? '(deleted)'}`);
  }
  console.log('Commands in the approved setup plan:');
  for (const command of preview.commands) console.log(`  ${command}`);
  console.log('Host guarantees:');
  for (const guarantee of preview.hostGuarantees) console.log(`  ${guarantee}`);
  if (preview.unresolvedDecisions.length > 0) {
    console.log('Unresolved decisions:');
    for (const decision of preview.unresolvedDecisions) console.log(`  ${decision}`);
  }
  console.log('Review complete file contents with --json. Apply this plan with: ark start --apply');
}

export function applyStartPreview(root, preview) {
  for (const change of preview.changes) {
    const target = path.join(root, change.path);
    if (change.action === 'delete') {
      fs.rmSync(target, { force: true });
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, Buffer.from(change.afterBase64, 'base64'));
  }
}

export async function planStart(args, helpers) {
  const root = args.root;
  const before = treeFiles(root);
  let recommendation = null;
  try {
    const rec = buildArchitectureRecommendation(root);
    recommendation = {
      archetype: rec.archetype,
      label: rec.label,
      confidence: rec.confidence,
      mature: rec.mature,
    };
  } catch {
    recommendation = null;
  }
  const shadowRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ark-start-preview-'));
  try {
    fs.cpSync(root, shadowRoot, {
      recursive: true,
      filter: (source) => {
        const relative = path.relative(root, source).split(path.sep).join('/');
        return !relative.split('/').some((part) => ['.git', 'node_modules', 'dist', 'coverage'].includes(part));
      },
    });
    const childArgs = ['start', '--root', shadowRoot, '--internal-apply', '--skip-package-manager'];
    if (args.yes) childArgs.push('--yes');
    if (args.force) childArgs.push('--force');
    if (!args.strict) childArgs.push('--no-strict');
    if (!args.install) childArgs.push('--no-install');
    if (args.tools) childArgs.push('--tools', args.tools);
    if (args.requireWriteHook) childArgs.push('--require-write-hook', args.requireWriteHook);
    const planned = spawnSync(process.execPath, [helpers.cliPath, ...childArgs], {
      cwd: shadowRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    if ((planned.status ?? 1) !== 0) {
      throw new Error(`Unable to produce a safe start plan (exit ${planned.status ?? 1}): ${planned.stderr || planned.stdout}`.trim());
    }
    const coverageRun = spawnSync(process.execPath, [helpers.arkCheck, '--root', shadowRoot, '--config', 'ark.config.json', '--coverage', '--json'], { cwd: shadowRoot, encoding: 'utf8' });
    let coverage = {};
    try {
      coverage = JSON.parse(coverageRun.stdout || '{}').coverage || {};
    } catch {
      coverage = {};
    }
    const afterRaw = treeFiles(shadowRoot);
    const after = new Map([...afterRaw].map(([file, content]) => [file, normalizedContent(content, shadowRoot, root)]));
    const changes = [];
    for (const file of [...new Set([...before.keys(), ...after.keys()])].sort()) {
      const oldContent = before.get(file);
      const newContent = after.get(file);
      if (oldContent?.equals(newContent) || (!oldContent && !newContent)) continue;
      changes.push({
        path: file,
        action: !oldContent ? 'create' : !newContent ? 'delete' : 'edit',
        beforeHash: oldContent ? digest(oldContent) : null,
        afterHash: newContent ? digest(newContent) : null,
        beforeBase64: oldContent ? oldContent.toString('base64') : null,
        afterBase64: newContent ? newContent.toString('base64') : null,
      });
    }
    const percent = coverage.governed?.percent ?? null;
    return {
      version: 1,
      root,
      readOnly: true,
      analysis: recommendation,
      projectedCoverage: {
        percent,
        classifiedFiles: coverage.governed?.classifiedFiles ?? 0,
        totalFiles: coverage.governed?.totalFiles ?? coverage.totalFiles ?? 0,
      },
      changes,
      commands: commands(root, args, helpers),
      hostGuarantees: [
        args.requireWriteHook ? `Hard-write hook verified for ${args.requireWriteHook}` : 'shared CI merge gate will be installed',
        'preview phase performs no writes in the target project',
        'apply writes the exact bytes identified by each afterHash',
      ],
      unresolvedDecisions: percent !== null && percent < 90 ? [`Projected governed coverage is ${percent}%; review unclassified files before treating the contract as complete.`] : [],
    };
  } finally {
    fs.rmSync(shadowRoot, { recursive: true, force: true });
  }
}
