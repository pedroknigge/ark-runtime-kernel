# How to install agent gates

```bash
npx arkgate-check --install-agent-gates
npx arkgate-check --install-agent-gates --tools claude,cursor,codex,grok
# aliases: ark-check …
```

Installs:

- Write-gate hook configuration (Claude / Grok PreToolUse; Cursor advisory + MCP)
- MCP server entry (`.mcp.json`, Cursor/Codex/Grok equivalents)
- `/ark-*` skills including **`/ark-architect`**, **`/ark-autopilot`**, **`/ark-loop`**
  (with current `mechanical-safe` remediation kinds)

| Host | Extra paths |
|------|-------------|
| Claude Code | `.claude/settings.json`, `.claude/skills/` |
| Cursor | `.cursor/mcp.json`, `.cursor/rules/ark.mdc`, `.cursor/commands/` |
| Codex | `docs/ark-codex-config.toml` + home MCP/prompts |
| **Grok Build** | `.grok/config.toml`, `.grok/hooks/`, `.grok/skills/` |

## Session hint

`arkgate-mcp --session-context` appends when governed coverage is low:

```
New to Ark? Run /ark-architect or: ark-check --recommend
```

## Verify gates

```bash
npx arkgate-check --doctor
npx arkgate-check --require-gates
```

After upgrading the package, refresh skills so agents see the latest plan kinds:

```bash
npx arkgate-check --install-agent-gates --skills-only --force
```

Full copy-paste setups: [docs/ai-gates.md](../ai-gates.md).