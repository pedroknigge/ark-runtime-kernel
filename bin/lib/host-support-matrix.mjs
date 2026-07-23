/**
 * Canonical host support promises.
 *
 * These records describe what ArkGate can install for each supported host.
 * Installed evidence remains authoritative for a specific repository and is
 * reported separately by write-path-capabilities.mjs.
 */

function hostProfile(label, hookPath, hookSurface, hookOperations, hardWrite, repairPayload) {
  return Object.freeze({
    label,
    hookPath,
    hookSurface,
    hookOperations: Object.freeze(hookOperations),
    capabilities: Object.freeze({
      'hard-write': hardWrite,
      'advisory-write': true,
      'merge-gate': true,
      'repair-payload': repairPayload,
    }),
  });
}

export const HOST_SUPPORT_MATRIX = Object.freeze({
  claude: hostProfile(
    'Claude Code',
    '.claude/settings.json',
    'PreToolUse `Write` / `Edit` / `MultiEdit`',
    ['Write', 'Edit', 'MultiEdit'],
    true,
    true
  ),
  grok: hostProfile(
    'Grok Build',
    '.grok/hooks/ark-write-gate.json',
    'PreToolUse `write` / `search_replace` (plus aliases)',
    ['write', 'search_replace'],
    true,
    true
  ),
  // Google Antigravity: official PreToolUse deny is a hard block. Claim hard only when
  // installed + trusted and the listed write tools are covered by the adapter.
  antigravity: hostProfile(
    'Google Antigravity',
    '.agents/hooks.json',
    'PreToolUse `write_to_file` / `replace_file_content` / `multi_replace_file_content`',
    ['write_to_file', 'replace_file_content', 'multi_replace_file_content'],
    true,
    true
  ),
  cursor: hostProfile('Cursor', null, null, [], false, false),
  codex: hostProfile(
    'OpenAI Codex',
    '.codex/hooks.json',
    'Best-effort PreToolUse `apply_patch`; Code Mode hosts may bypass the event',
    ['apply_patch'],
    false,
    false
  ),
  // OpenCode: first-class MCP + permissions; plugin tool.execute.before is incomplete
  // (subagent holes). Never claim hard write.
  opencode: hostProfile(
    'OpenCode',
    null,
    'Advisory MCP + optional experimental plugin (`tool.execute.before`); not a hard boundary',
    [],
    false,
    false
  ),
});

export const HOST_SUPPORT_HOSTS = Object.freeze(Object.keys(HOST_SUPPORT_MATRIX));

export function getHostSupportProfile(host) {
  const normalized = typeof host === 'string' ? host.trim().toLowerCase() : '';
  return HOST_SUPPORT_MATRIX[normalized] ?? null;
}

export function formatHostSupportSummary(profile) {
  if (!profile) return 'unknown host; no local write guarantee';
  const capabilities = profile.capabilities;
  const write = capabilities['hard-write']
    ? 'hard local write boundary'
    : 'no hard local write boundary';
  const repair = capabilities['repair-payload'] ? 'repair payload' : 'no hard-boundary repair';
  return `${write} + advisory MCP + CI check + ${repair}`;
}

export function renderHostSupportMatrixMarkdown() {
  const rows = HOST_SUPPORT_HOSTS.map((host) => {
    const profile = HOST_SUPPORT_MATRIX[host];
    const capabilities = profile.capabilities;
    // Fail-closed honesty: Cursor/Codex/OpenCode never claim hard write; CI is required-status.
    // hookSurface already includes "PreToolUse …" — do not prefix PreToolUse again.
    let local;
    if (capabilities['hard-write']) {
      local = `**Hard** block for listed ops (${profile.hookSurface}) when installed + trusted`;
    } else if (host === 'codex') {
      local =
        '**Advisory / best-effort** at write (not equivalent to Claude/Grok hard block)';
    } else if (host === 'opencode') {
      local =
        '**Advisory / best-effort** at write (MCP + optional plugin; not a hard boundary)';
    } else {
      local = '**Advisory only** at write (no hard hook)';
    }
    const repair = capabilities['repair-payload']
      ? 'Emitted on hook deny; host must re-inject'
      : 'No hard-boundary payload';
    const merge = capabilities['hard-write']
      ? '**Required status** = hard merge boundary (`arkgate-check --strict-merge`)'
      : '**Required status** = hard merge boundary (same CI)';
    return `| ${profile.label} | ${local} | Advisory; the agent must call it | ${merge} | ${repair} |`;
  }).join('\n');

  return `| Host | Local write boundary | MCP validation | CI / merge path | Repair payload |
|------|----------------------|----------------|-----------------|----------------|
${rows}

**Read the CI column:** for every host, the repository-wide hard guarantee is a **required**
merge check — not “CI file present.” Cursor/Codex/OpenCode never get a fake hard write claim.

This table describes the supported profile **after its files are installed and the host loads/trusts them**. A hard local boundary covers only the listed hook operations; alternate tools, direct filesystem writes, and human edits still rely on CI. MCP validation is advisory because the agent must call it. The CI check blocks a merge only when the repository makes that status required. Repair payloads never write code silently: the host must re-inject the candidate and ArkGate revalidates it. Run \`arkgate-check --doctor\` for the evidence actually detected in the current repository.`;
}

/**
 * Doctor human one-liner for active-host write honesty (fail-closed).
 * @returns {string|null}
 */
export function doctorWritePathHonestyMessage(activeHost, hardWriteActive) {
  const host = typeof activeHost === 'string' ? activeHost.trim().toLowerCase() : '';
  if (host === 'cursor') {
    return 'Cursor: write path is advisory (MCP/rules; no hard PreToolUse). Required CI status (arkgate-check --strict-merge) is the hard merge boundary.';
  }
  if (host === 'codex') {
    return 'Codex: write path is advisory / best-effort at write (not Claude/Grok hard). Required CI status (arkgate-check --strict-merge) is the hard merge boundary.';
  }
  if (host === 'opencode') {
    return 'OpenCode: write path is advisory / best-effort (MCP + optional plugin; not Claude/Grok/Antigravity hard). Required CI status (arkgate-check --strict-merge) is the hard merge boundary.';
  }
  if ((host === 'claude' || host === 'grok' || host === 'antigravity') && !hardWriteActive) {
    const label =
      host === 'claude' ? 'Claude' : host === 'grok' ? 'Grok' : 'Antigravity';
    return `${label}: hard PreToolUse is supported for listed ops when installed + trusted; without runtime-observed hook evidence, hard is unverified. Required CI remains the merge hard boundary.`;
  }
  return null;
}
