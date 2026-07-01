# Ark — Agent Integration Guide

This guide describes how AI agents and codegen tools can safely interact with Ark.

## Contract Discovery

Prefer `createStrictArkKernel()` for strict projects. It wires the registry, graph,
policies, event bus, audit trail, event contracts, outbox, projections, metadata,
workflow engine, and 11-layer architecture profile:

```ts
import {
  createStrictArkKernel,
} from 'ark-runtime-kernel';

const ark = createStrictArkKernel();
// ... define intents, event contracts, metadata, projections, and workflows through ark.*

const contract = ark.manifest().toJSON();
// contract.intents, policies, entities, graph, architecture, eventContracts, projections
```

Agents should read `contract` before generating or modifying code.

## Naming Conventions

| Prefix | Layer | Example |
|--------|-------|---------|
| `Domain.*` | Domain events & entities | `Domain.Order.OrderPlaced` |
| `Application.*` | Use cases / orchestration | `Application.PlaceOrder` |
| `Adapter.Persistence.*` | Persistence adapters | `Adapter.Persistence.OrderRepo` |
| `Adapter.Integration.*` | External integrations | `Adapter.Integration.PaymentGateway.Charge` |
| `Workflow.*` | Sagas / long-running processes | `Workflow.OrderFulfillment` |
| `Job.*` | Background jobs / scheduling | `Job.InventoryRebuild` |
| `Presentation.*` | UI/API adapters | `Presentation.Api.PlaceOrder` |
| `Reporting.*` | Read models / projections | `Reporting.OrderSummary` |
| `Metadata.*` | Metadata and extension contracts | `Metadata.OrderSchema` |
| `Security.*`, `Audit.*`, `Observability.*` | Cross-cutting concerns | `Audit.OrderHistory` |
| `Kernel.*` | Ark-owned governance signals | `Kernel.PolicyViolation` |

Declare relationships at definition time:

```ts
registry.define('Application.PlaceOrder', {
  dependsOn: ['Domain.Order.OrderPlaced'],
  produces: ['Domain.Order.OrderPlaced'],
});
```

Strict kernels also require published events to have a registered source intent
and a matching event contract:

```ts
const OrderPlaced = registry.define<
  'Domain.Order.OrderPlaced',
  { orderId: string; amount: number }
>('Domain.Order.OrderPlaced');

registry.define('Application.PlaceOrder', {
  produces: ['Domain.Order.OrderPlaced'],
});

ark.eventContracts.register({
  intent: 'Domain.Order.OrderPlaced',
  version: '1',
  allowAdditionalFields: false,
  schema: {
    orderId: { type: 'string', required: true },
    amount: { type: 'number', required: true },
  },
});

await ark.eventBus.publish(OrderPlaced, { orderId: 'o1', amount: 99 }, {
  source: 'Application.PlaceOrder',
  eventVersion: '1',
});
```

## Code Generation Validation

Use `createAICodeGate()` before merging agent-generated source snippets:

```ts
const gate = createAICodeGate({
  intents: registry.list(),
  enforceIntentAllowlist: true,
  architectureProfile: elevenLayerProfile,
  extensions: [/* optional external AST analyzers implementing AIGateExtension */],
});

const result = gate.validate(generatedSource, {
  filePath: 'src/domain/order.ts',
  agentId: 'agent-1',
  layer: 'DomainModel',
});
if (!result.valid) {
  for (const v of result.violations) {
    console.log(v.code, v.message, v.suggestion);
  }
}
```

Violation codes: `FORBIDDEN_PATTERN`, `FORBIDDEN_SUBSTRING`, `POLICY_VIOLATION`, `UNKNOWN_INTENT`, `LAYER_REFERENCE_VIOLATION`, `EXTENSION_ERROR`.

Use `ark-check` in CI for repository-level checks that need real file paths:

```bash
npx ark-check --root . --config ark.config.json
```

Example config:

```json
{
  "include": ["src"],
  "layers": [
    {
      "name": "DomainModel",
      "patterns": ["src/domain/**"],
      "intentPrefixes": ["Domain."]
    },
    {
      "name": "PersistenceAdapters",
      "patterns": ["src/adapters/persistence/**"],
      "intentPrefixes": ["Adapter.Persistence."]
    },
    {
      "name": "ApplicationOrchestration",
      "patterns": ["src/application/**"],
      "intentPrefixes": ["Application."]
    }
  ],
  "rules": [
    {
      "from": "DomainModel",
      "to": "PersistenceAdapters",
      "allowed": false
    }
  ]
}
```

`ark-check` uses the TypeScript AST for imports and string intent references.
It is intentionally not a full type-aware semantic analyzer.

## Runtime Observability

The event bus exposes a standard trace format:

```ts
const bus = createEventBus({
  maxHistorySize: 1000,
  auditTrail,
  traceSinks: [(record) => otelBridge(record)],
  onSoftViolation: (result, event) => { /* advisory policies */ },
  onHandlerError: (err, event, intent) => { /* subscriber failures */ },
});

await bus.publish(intent, payload);
const trace = bus.getTrace();
// trace[].type: 'event.published' | 'policy.hardViolation' | 'policy.softViolation' | 'handler.error'
```

Native audit records are available through `auditTrail.query()`. Projection
state and checkpoints are available through `ProjectionRegistry`.

## Extension Points (External Layers)

Implement these interfaces in **external** packages — not inside the Ark core:

| Interface | Purpose |
|-----------|---------|
| `AIGateExtension` | Plug in AST/semantic analyzers for codegen validation |
| `Policy` | Custom architectural rules via `definePolicy()` |
| `LayerFlowRule` | Layer isolation via `defineLayerPolicy()` |
| `WorkflowStore` | Persist workflow snapshots outside memory |
| `ReadModelStore` | Persist projection/read-model state outside memory |
| `AuditStore` | Persist audit records outside memory |
| `OutboxStore` | Persist event outbox records outside memory |

Preset: `elevenLayerProfile` plus `defineArchitectureProfilePolicy()` forbids invalid declared dependencies across the 11-layer profile. `architecturalPolicies.cleanArchitectureMatrix()` remains available for the older four-prefix model.

## Recommended Agent Workflow

1. **Read** manifest via `ark.manifest().toJSON()`
2. **Generate** code using registered intents, profiles, metadata, projections, and workflow definitions
3. **Validate snippets** with `createAICodeGate().validate(source, { layer })`
4. **Validate repository** with `ark-check --root . --config ark.config.json`
5. **Wire** relationships via `registry.define(..., { dependsOn, produces })`
6. **Register** event contracts before publishing in strict mode
7. **Observe** runtime via `bus.getTrace()`, `auditTrail.query()`, outbox records, and projection checkpoints
