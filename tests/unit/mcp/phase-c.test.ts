import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, spawnSync, execSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withDistLock } from '../../helpers/distLock';

const root = process.cwd();
let mcpRuntimeDir: string | undefined;
let mcpBin = path.join(root, 'bin', 'ark-mcp.mjs');

function prepareMcpRuntime() {
  if (mcpRuntimeDir) return;
  withDistLock(() => {
    execSync('npm run build', { stdio: 'ignore' });
    mcpRuntimeDir = fs.mkdtempSync(path.join(root, '.ark-mcp-runtime-'));
    fs.cpSync(path.join(root, 'bin'), path.join(mcpRuntimeDir, 'bin'), { recursive: true });
    fs.cpSync(path.join(root, 'dist'), path.join(mcpRuntimeDir, 'dist'), { recursive: true });
    fs.cpSync(path.join(root, 'templates'), path.join(mcpRuntimeDir, 'templates'), { recursive: true });
  });
  mcpBin = path.join(mcpRuntimeDir!, 'bin', 'ark-mcp.mjs');
}

afterAll(() => {
  if (!mcpRuntimeDir) return;
  fs.rmSync(mcpRuntimeDir, { recursive: true, force: true });
});

function createClient(projectRoot: string) {
  const proc = spawn('node', [mcpBin, '--root', projectRoot], {
    stdio: ['pipe', 'pipe', 'pipe'],
  }) as ChildProcessWithoutNullStreams;

  const pending = new Map<number, (msg: any) => void>();
  let buffer = '';
  proc.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    let idx: number;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) {
        pending.get(msg.id)!(msg);
        pending.delete(msg.id);
      }
    }
  });

  let nextId = 1;
  function request(method: string, params?: unknown): Promise<any> {
    const id = nextId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }
  function close() {
    proc.stdin.end();
    proc.kill();
  }
  return { request, close };
}

describe('Phase C — ark_recommend MCP tool', () => {
  let client: ReturnType<typeof createClient>;
  let greenfield: string;

  beforeAll(() => {
    prepareMcpRuntime();
    greenfield = fs.mkdtempSync(path.join(os.tmpdir(), 'ark-phasec-green-'));
    fs.writeFileSync(
      path.join(greenfield, 'package.json'),
      JSON.stringify({ name: 'greenfield', version: '0.0.0' })
    );
    client = createClient(greenfield);
  }, 120000);

  afterAll(() => client?.close());

  it('lists ark_recommend in tools/list', async () => {
    const res = await client.request('tools/list');
    expect(res.result.tools.map((t: { name: string }) => t.name)).toContain('ark_recommend');
  });

  it('returns the same structured plan as ark-check --recommend --json', async () => {
    const mcpRes = await client.request('tools/call', { name: 'ark_recommend', arguments: {} });
    const mcpPayload = JSON.parse(mcpRes.result.content[0].text);

    const cli = spawnSync(
      'node',
      [path.join(mcpRuntimeDir!, 'bin', 'ark-check.mjs'), '--root', greenfield, '--recommend', '--json'],
      { encoding: 'utf8' }
    );
    const cliPayload = JSON.parse(cli.stdout);

    expect(mcpPayload.archetype).toBe(cliPayload.archetype);
    expect(mcpPayload.preset).toBe(cliPayload.preset);
    expect(mcpPayload.adoptInOrder.phase1).toEqual(cliPayload.adoptInOrder.phase1);
    expect(mcpPayload.confidence).toBe(cliPayload.confidence);
  });
});

describe('Phase C — session-context enthusiast hint', () => {
  beforeAll(() => {
    prepareMcpRuntime();
  });

  function runSessionContext(projectRoot: string) {
    return spawnSync(
      'node',
      [mcpBin, '--session-context', '--root', projectRoot, '--config', 'ark.config.json'],
      { encoding: 'utf8' }
    );
  }

  it('appends New to Ark hint when governed coverage is low', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ark-phasec-session-'));
    fs.mkdirSync(path.join(projectRoot, 'src/loose'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'src/loose/util.ts'), 'export const u = 1;\n');
    fs.writeFileSync(
      path.join(projectRoot, 'ark.config.json'),
      JSON.stringify({
        include: ['src'],
        layers: [{ name: 'DomainModel', patterns: ['src/domain/**'], intentPrefixes: ['Domain.'] }],
        rules: [],
      })
    );

    const result = runSessionContext(projectRoot);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('New to Ark?');
    expect(result.stdout).toContain('/ark-architect');
    expect(result.stdout).toContain('ark-check --recommend');
  });

  it('omits enthusiast hint when coverage is high', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ark-phasec-session-ok-'));
    fs.mkdirSync(path.join(projectRoot, 'src/domain'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'src/domain/order.ts'), 'export const o = 1;\n');
    fs.writeFileSync(
      path.join(projectRoot, 'ark.config.json'),
      JSON.stringify({
        include: ['src'],
        layers: [{ name: 'DomainModel', patterns: ['src/domain/**'], intentPrefixes: ['Domain.'] }],
        rules: [],
      })
    );

    const result = runSessionContext(projectRoot);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain('New to Ark?');
  });
});

describe('Phase C — ark-architect skill template', () => {
  it('ships in templates/skills and references ark_recommend', () => {
    const skillPath = path.join(root, 'templates/skills/ark-architect.md');
    expect(fs.existsSync(skillPath)).toBe(true);
    const content = fs.readFileSync(skillPath, 'utf8');
    expect(content).toContain('name: ark-architect');
    expect(content).toContain('ark_recommend');
    expect(content).toContain('ark init --archetype');
  });
});