import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withDistLock } from '../helpers/distLock';

const repo = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'structrail-package-managers-'));
const managers = ['npm', 'pnpm', 'yarn'] as const;
type Manager = (typeof managers)[number];

let primaryTarball = '';
let legacyTarball = '';
let typescriptTarball = '';
let nestTarball = '';

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function pack(cwd: string, destination: string) {
  const output = execFileSync('npm', ['pack', '--pack-destination', destination, '--silent'], {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      npm_config_cache: path.join(tmp, 'npm-pack-cache'),
      npm_config_ignore_scripts: 'true',
    },
  }).trim();
  return path.join(destination, output.split(/\r?\n/).at(-1)!);
}

beforeAll(() => {
  const packs = path.join(tmp, 'packs');
  const nestStub = path.join(tmp, 'nestjs-common');
  fs.mkdirSync(packs, { recursive: true });
  fs.mkdirSync(nestStub, { recursive: true });
  fs.writeFileSync(
    path.join(nestStub, 'package.json'),
    `${JSON.stringify(
      {
        name: '@nestjs/common',
        version: '11.0.0',
        type: 'module',
        exports: './index.js',
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    path.join(nestStub, 'index.js'),
    'export const Inject = () => () => {};\nexport const Module = () => value => value;\n'
  );
  withDistLock(() => {
    primaryTarball = pack(repo, packs);
  });
  legacyTarball = pack(path.join(repo, 'compat', 'arkgate'), packs);
  typescriptTarball = pack(path.join(repo, 'node_modules', 'typescript'), packs);
  nestTarball = pack(nestStub, packs);
}, 120_000);

function fileSpec(file: string) {
  return `file:${file.split(path.sep).join('/')}`;
}

function localBin(root: string, name: string) {
  return path.join(
    root,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? `${name}.cmd` : name
  );
}

function managerBin(manager: Manager) {
  return manager === 'npm' ? 'npm' : localBin(repo, manager);
}

function install(manager: Manager, root: string) {
  const commonEnvironment = {
    ...process.env,
    npm_config_registry: 'http://127.0.0.1:9',
    npm_config_cache: path.join(root, '.cache', 'npm'),
    YARN_CACHE_FOLDER: path.join(root, '.cache', 'yarn'),
  };
  const commands: Record<Manager, string[]> = {
    npm: ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'],
    pnpm: [
      'install',
      '--offline',
      '--ignore-scripts',
      '--store-dir',
      path.join(root, '.cache', 'pnpm-store'),
    ],
    yarn: ['install', '--offline', '--ignore-scripts', '--non-interactive', '--no-progress'],
  };
  execFileSync(managerBin(manager), commands[manager], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 90_000,
    env: commonEnvironment,
  });
}

function writeConsumer(
  manager: Manager,
  scenario: 'primary' | 'legacy' | 'combined'
) {
  const root = path.join(tmp, `${manager}-${scenario}`);
  fs.mkdirSync(root, { recursive: true });
  const dependencies: Record<string, string> = {
    '@nestjs/common': fileSpec(nestTarball),
    typescript: fileSpec(typescriptTarball),
  };
  if (scenario !== 'legacy') dependencies.structrail = fileSpec(primaryTarball);
  if (scenario !== 'primary') dependencies.arkgate = fileSpec(legacyTarball);
  const primaryOverride = fileSpec(primaryTarball);
  const offlineResolutions = {
    '@nestjs/common': fileSpec(nestTarball),
    typescript: fileSpec(typescriptTarball),
    ...(scenario !== 'primary' ? { structrail: primaryOverride } : {}),
  };
  const pkg = {
    name: `${manager}-${scenario}-consumer`,
    private: true,
    type: 'module',
    dependencies,
    resolutions: offlineResolutions,
    pnpm: { overrides: offlineResolutions },
    ...(scenario !== 'primary'
      ? {
          overrides: { structrail: primaryOverride },
        }
      : {}),
  };
  fs.writeFileSync(path.join(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  return root;
}

function smoke(root: string, scenario: 'primary' | 'legacy' | 'combined') {
  const imports = [
    ...(scenario !== 'legacy'
      ? [
          "await import('structrail');",
          "await import('structrail/runtime');",
          "await import('structrail/eslint');",
          "await import('structrail/nestjs');",
        ]
      : []),
    ...(scenario !== 'primary'
      ? [
          "await import('arkgate');",
          "await import('arkgate/runtime');",
          "await import('arkgate/eslint');",
          "await import('arkgate/nestjs');",
        ]
      : []),
  ];
  execFileSync(process.execPath, ['--input-type=module', '--eval', imports.join('\n')], {
    cwd: root,
    stdio: 'pipe',
  });

  const bins = [
    ...(scenario !== 'legacy'
      ? ['structrail', 'structrail-check', 'structrail-mcp']
      : []),
    ...(scenario !== 'primary'
      ? ['arkgate', 'arkgate-check', 'arkgate-mcp', 'ark', 'ark-check', 'ark-mcp']
      : []),
  ];
  for (const name of bins) {
    expect(fs.existsSync(localBin(root, name)), `${scenario}:${name}`).toBe(true);
    expect(
      execFileSync(localBin(root, name), ['--version'], {
        cwd: root,
        encoding: 'utf8',
      }).trim(),
      `${scenario}:${name} --version`
    ).toBe('3.0.0');
  }
}

describe.sequential('Structrail package-manager compatibility matrix', () => {
  for (const manager of managers) {
    for (const scenario of ['primary', 'legacy', 'combined'] as const) {
      it(`${manager} installs the ${scenario} path from clean local tarballs`, () => {
        const root = writeConsumer(manager, scenario);
        install(manager, root);
        const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
        if (scenario === 'legacy') {
          expect(pkg.dependencies.structrail).toBeUndefined();
          expect(pkg.dependencies.arkgate).toBe(fileSpec(legacyTarball));
        }
        smoke(root, scenario);
      }, 120_000);
    }
  }
});
