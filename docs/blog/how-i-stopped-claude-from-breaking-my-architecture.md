# How I stopped Claude from breaking my hexagonal architecture

*Draft — publish on dev.to / HN / r/typescript alongside the repo going public.*

---

AI agents write most of my code now. They're fast, they're tireless, and they have absolutely no respect for my architecture.

Ask an agent to "add a findById method to Order" and there's a decent chance it imports the Postgres repository straight into the domain layer. The code compiles. The tests pass. The PR looks fine at a glance. Three months of that and your hexagonal architecture is a decorative diagram.

The usual answer is "review harder" — which doesn't scale when the agent produces 30 PRs a week — or "add a linter", which catches the violation *after* the agent already built three files on top of it.

## The insight: block at write time, not review time

Agent runtimes like Claude Code have pre-write hooks: a shell command that runs *before* a file edit lands, and can veto it. That's a fundamentally better enforcement point than CI:

1. The violation never reaches disk.
2. The agent sees the error **in its loop** and self-corrects immediately — it defines the port in the domain and implements it in the adapter, like you would have asked for in review.

So I built [Ark](https://github.com/pedroknigge/ark-runtime-kernel). You describe your architecture once, as data:

```json
{
  "layers": [
    { "name": "DomainModel", "patterns": ["src/domain/**"] },
    { "name": "PersistenceAdapters", "patterns": ["src/adapters/persistence/**"] }
  ],
  "rules": [
    { "from": "DomainModel", "to": "PersistenceAdapters", "allowed": false }
  ]
}
```

Then wire it into Claude Code as a PreToolUse hook:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{ "type": "command",
        "command": "npx ark-mcp --hook --root \"$CLAUDE_PROJECT_DIR\" --config ark.config.json" }]
    }]
  }
}
```

Now the same request plays out like this:

```
● Write(src/domain/order.ts)
✗ Ark architecture gate blocked this write to src/domain/order.ts (layer: DomainModel):
- [FORBIDDEN_PATTERN] Forbidden pattern matched: /from ['"].*\/(infra|adapters|persistence|db)/i (line 1)
- [FORBIDDEN_IMPORT] Forbidden import target: "../adapters/persistence/order-repository". (line 1)
Fix the violations and retry. The architecture contract is available as the ark://manifest MCP resource.

● The domain layer can't import persistence adapters. I'll define the port in
  the domain instead and implement it in src/adapters/persistence/.
```

The agent fixed its own architecture violation. Nobody reviewed anything.

## Details that turned out to matter

**The gate validates the post-edit file, not the diff.** An edit snippet out of context tells you nothing about imports. `ark-mcp --hook` applies the proposed edit to the current file content and validates the result.

**The same config gates CI.** Not every write goes through an agent, and not every agent runtime has hooks. `ark-check` runs the same rules in CI with TypeScript's real module resolver — path aliases and all — so nothing merges that violates the contract, whoever wrote it.

**Agents can read the contract, not just bounce off it.** The MCP server also exposes `ark://manifest` — the architecture as JSON — so agents get the rules *before* generating code instead of learning by rejection.

**Existing codebases need a ratchet.** Nobody adopts a checker that greets them with 400 errors. `ark-check --update-baseline` freezes today's violations; from then on only *new* ones fail. The count only goes down.

## What about dependency-cruiser / eslint-plugin-boundaries?

They're good tools and they cover the CI half. What they don't have is the write-time half: an MCP server and hook designed for agent runtimes, plus a machine-readable manifest for agents to consume. That's the part that changes agent behavior instead of just grading it.

## Try it

```bash
npm i -D ark-runtime-kernel typescript
npx ark-check --init      # infers layers from your folder structure
npx ark-check             # CI gate
```

Repo: https://github.com/pedroknigge/ark-runtime-kernel — zero dependencies, MIT.
