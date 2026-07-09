# ddd-context-starter

**Archetype:** `ddd-bounded-contexts` — multiple business domains with a thin shared kernel.

**Analogy:** Separate city districts with a shared square; no tunnels between private basements.

Phase-1 scaffold. Same-layer imports across contexts are blocked via `peerIsolation`.

## Layout

```
src/
  contexts/
    billing/
      domain/
      application/
    identity/
      domain/
      application/
  shared/
    kernel/
```

## Phase 1 layers

| Layer | Put here when you build… |
|-------|--------------------------|
| DomainModel | Entities and invariants under `contexts/<name>/domain` |
| ApplicationOrchestration | Use cases under `contexts/<name>/application` |
| SharedKernel | Truly shared types only (`shared/kernel`) |
| PersistenceAdapters / PresentationAdapters | Phase 2 per context |

## Three rules for your AI agent

1. **Contexts do not import each other** at domain or application layers.
2. **Domain must not use fetch/process/Date.now** — inject ports.
3. **Do not weaken `ark.config.json` to pass.** Integrate via events or shared kernel.

## Verify

```bash
npm run check
```

Init: `ark init --preset ddd-bounded-contexts` or `ark init --archetype ddd-bounded-contexts --yes`.
