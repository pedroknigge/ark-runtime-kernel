# Ark Roadmap

Direction: **the differentiated product is the static/agent side** — one machine-readable architecture contract (`ark.config.json`) enforced at write time (AI agents), merge time (CI), and optionally at runtime. The runtime kernel is an opt-in layer, not the pitch.

## Shipped

- `ark-check` — CI gate with real TypeScript module resolution, `--init` config inference, `--strict-config` coverage enforcement, `--baseline` ratchet for existing codebases
- `ark-mcp` — MCP server (`validate_code` tool + `ark://manifest` resource) and `--hook` one-shot PreToolUse gate for Claude Code
- ESLint plugin (`ark-runtime-kernel/eslint`)
- Runtime kernel: intent registry, strict event bus, event contracts (own schema + Standard Schema validators), policies, observed layer flow, projections, manifest, audit/outbox/workflow interfaces with in-memory defaults
- NestJS adapter (`ark-runtime-kernel/nestjs`)
- GitHub Action (`action.yml`) with PR comments
- `examples/hexagonal-order-api/` — clonable hexagonal API governed by all three gates, with a "break it on purpose" walkthrough
- Zero runtime dependencies throughout

## Next

- [ ] **MCP registry presence** — publish `server.json` to the official MCP registry so agents discover the gate
- [ ] **Example gallery** — more clonable examples beyond `examples/hexagonal-order-api` (NestJS app, monorepo)
- [ ] **`ark-check --fix` exploration** — auto-move misplaced files / rewrite imports where unambiguous
- [ ] **Revisit default rule matrix** — `PersistenceAdapters → DomainModel` is blocked by default, but hexagonal adapters typically import domain types; needs a decision + migration note
- [ ] **Watch mode** — `ark-check --watch` for editor-adjacent feedback without ESLint
- [ ] **Docs site** — move long-form docs off the README

## Later / undecided

- Split the runtime kernel into a separate package so the gates ship dependency-free and tiny
- Adapters for more frameworks (Fastify plugin, Next.js)
- Cross-package governance for monorepos (today: run per package)

## Not planned

- **Reimplementing workflow orchestrators** (Temporal, Restate, …). The in-memory audit/outbox/projection/workflow stores are development defaults, not production infrastructure — implement the store interfaces (see [docs/production-hardening.md](docs/production-hardening.md)) against your own durable systems.
- **Runtime dependencies.** Zero is a hard rule.

Have an opinion on any of these? Open an issue.
