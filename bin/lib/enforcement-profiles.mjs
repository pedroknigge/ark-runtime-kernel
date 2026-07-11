/**
 * Static host support plus preflight validation for requested write guarantees.
 * Installed evidence remains authoritative in write-path-capabilities.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { detectWritePathCapabilities } from './write-path-detect.mjs';
import { KNOWN_TOOLS, normalizeToolsList } from './skill-install.mjs';

export const HOST_ENFORCEMENT_SUPPORT = Object.freeze({
  claude: Object.freeze({
    hardWrite: true,
    advisoryWrite: true,
    hookPath: '.claude/settings.json',
  }),
  grok: Object.freeze({
    hardWrite: true,
    advisoryWrite: true,
    hookPath: '.grok/hooks/ark-write-gate.json',
  }),
  cursor: Object.freeze({ hardWrite: false, advisoryWrite: true, hookPath: null }),
  codex: Object.freeze({ hardWrite: false, advisoryWrite: true, hookPath: null }),
});

export const WRITE_PROFILE_HOSTS = Object.freeze(Object.keys(HOST_ENFORCEMENT_SUPPORT));

export function validateSelectedTools(tools) {
  if (tools == null) return { ok: true, tools: null };
  const selected = normalizeToolsList(tools);
  const unknown = selected.filter((tool) => !KNOWN_TOOLS.includes(tool));
  if (selected.length === 0 || unknown.length > 0) {
    return {
      ok: false,
      error:
        `--tools expects a comma-separated subset of: ${KNOWN_TOOLS.join(', ')}` +
        (unknown.length > 0 ? ` (unknown: ${unknown.join(', ')})` : ''),
    };
  }
  return { ok: true, tools: selected };
}

export function hasHardWriteHook(root, host) {
  return detectWritePathCapabilities(root, host).capabilities['hard-write'];
}

export function validateHardWriteRequest({ root, host, tools, force = false }) {
  const toolSelection = validateSelectedTools(tools);
  if (!toolSelection.ok) return toolSelection;
  if (host == null) return { ok: true, host: null, tools: toolSelection.tools };

  const normalizedHost = String(host).trim().toLowerCase();
  const support = HOST_ENFORCEMENT_SUPPORT[normalizedHost];
  if (!support) {
    return {
      ok: false,
      error: `Unknown write host "${normalizedHost}". Expected: ${WRITE_PROFILE_HOSTS.join(', ')}.`,
    };
  }
  if (!support.hardWrite) {
    return {
      ok: false,
      error:
        `${normalizedHost} supports advisory-write plus hard merge enforcement, not a hard local write hook. ` +
        'Omit --require-write-hook and keep --strict-merge for CI.',
    };
  }

  const selectedTools = toolSelection.tools ?? [normalizedHost];
  if (!selectedTools.includes(normalizedHost)) {
    return {
      ok: false,
      error: `--require-write-hook ${normalizedHost} requires --tools to include ${normalizedHost}.`,
    };
  }

  const hookFile = path.join(root, support.hookPath);
  if (fs.existsSync(hookFile) && !force && !hasHardWriteHook(root, normalizedHost)) {
    return {
      ok: false,
      error:
        `${support.hookPath} already exists without an Ark hard-write hook and would be preserved. ` +
        'Use --force to replace that host file, or omit --require-write-hook for merge-only enforcement.',
    };
  }

  return {
    ok: true,
    host: normalizedHost,
    tools: selectedTools,
    support,
  };
}
