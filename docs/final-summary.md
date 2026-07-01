# Ark - v0.4 Production Readiness Summary

**Date:** 2026-07-01  
**Version:** 0.4.0
**Package name:** `ark-runtime-kernel`
**Runtime dependencies:** zero (`package.json` `"dependencies": {}`)

Ark v0.4 closes the next hardening phase from the 11-layer architecture review. It remains an in-process governance kernel, but now adds stricter runtime contracts and a CI-facing static checker so layer governance is no longer limited to declared runtime relationships.

## What Changed

| Area | v0.4 capability |
|------|-----------------|
| Strict runtime | `createStrictArkKernel()` requires registered event contracts and known source intents by default |
| Event contracts | `EventContractRegistry` validates event versions and payload shape before publish |
| Outbox | `OutboxStore` plus `InMemoryOutboxStore` provide a basic outbox handoff for published events |
| Static enforcement | `ark-check` parses TypeScript AST and detects configured layer import and intent-reference violations |
| Policy lifecycle | Policies now carry owner/version/rationale/enforcement-mode/deprecation metadata |
| Manifest | Exports event contracts and richer policy metadata for agents and governance tools |
| Package | Published package includes the `ark-check` bin entry and pack coverage verifies it |
| Prior v0.3 baseline | `createArkKernel()` still wires registry, graph, policies, event bus, audit, projections, metadata, workflow, and the 11-layer profile |
| 11-layer governance | `elevenLayerProfile`, `createArchitectureProfile()`, and `defineArchitectureProfilePolicy()` |
| Event bus | Audit trail integration, hard-policy traces, trace sinks, trace/span metadata |
| Workflow | `createWorkflowEngine()` with snapshots, retries, timeouts, compensation, pluggable `WorkflowStore`, and audit records |
| Audit/history | Native `AuditTrail`, `AuditStore`, bounded `InMemoryAuditStore`, and query API |
| Metadata | Version/owner/layer/tags, duplicate checks, relation validation, and intent lookup |
| Dependency graph | Layer-grouped Mermaid export via `toLayerMermaid(profile)` |
| AI gate | Line numbers, expanded intent prefixes, `architectureProfile`, and `LAYER_REFERENCE_VIOLATION` |
| Read models | `ProjectionRegistry`, `ReadModelStore`, checkpoints, audit records |

**Test count:** 85 passing tests across 26 files.
**Verification:** `npm run typecheck` and `npm test -- --run` pass.

## Remaining Boundaries

Ark still does not own durable infrastructure. Production systems must provide durable stores for audit, workflow snapshots, read models, outbox records, queues, databases, and cross-service orchestration when in-memory defaults are not enough.

Ark now includes a useful AST-based static checker, but it is not a full type-aware semantic analyzer. `AIGateExtension` remains the seam for deeper custom analysis.

## Bottom Line

Ark v0.4 is a stronger foundation for serious bounded-context architecture governance than v0.3. It now addresses the most important review gaps: bypass resistance in strict mode, explicit event contracts, source validation, CI-visible import checks, basic outbox support, and clearer policy lifecycle metadata.

It is still not sufficient as the only governance mechanism for complex distributed enterprises. For that level, Ark should be paired with durable infrastructure, CI policy ownership, operational tracing, and deeper static analysis.
