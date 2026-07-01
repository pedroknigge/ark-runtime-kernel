/**
 * Ark — Architectural Runtime Kernel
 *
 * A zero-dependency governance kernel for Hexagonal + Event-Driven + DDD systems.
 *
 * @packageDocumentation
 */

export { version } from './version';

// Domain types are re-exported below; no local value imports needed here.

/**
 * Core domain types (re-exported).
 */
export type {
  IntentName,
  DomainEvent,
  EventMetadata,
  CorrelationId,
} from './domain/types';

// =============================================================================
// Intent Registry & Semantic Dependencies (Iteration 1)
// =============================================================================

export {
  defineIntent,
  createIntentRegistry,
  defaultIntentRegistry,
  type IntentCreator,
  type IntentRelationship,
  type IntentRelationshipKind,
  type DefineIntentOptions,
  IntentRegistry, // class (usable as value and type)
  validateIntentName,
  type IntentNameValidation,
} from './kernel/intent';

// Re-export legacy IntentDefinition name for backwards compatibility during early development
export type { IntentCreator as IntentDefinition } from './kernel/intent';

// =============================================================================
// Policy Engine (Iteration 2)
// =============================================================================

export {
  definePolicy,
  PolicyEngine,
  PolicyViolationError,
  defineLayerPolicy,
  architecturalPolicies,
  isLayerPolicy,
  type Policy,
  type PolicySeverity,
  type PolicyViolation,
  type PolicyEvaluationResult,
  type DefinePolicyOptions,
  type LayerPolicyOptions,
  type LayerFlowRule,
} from './kernel/policy';

// =============================================================================
// Event Bus (Iteration 3)
// =============================================================================

export {
  createEventBus,
  type EventBus,
  type EventBusOptions,
  type EventHandler,
  type Unsubscribe,
  type PublishedEventRecord,
  type TraceRecord,
  type TraceRecordType,
  buildPublishPolicyContext,
  UnregisteredIntentError,
  InvalidIntentNameError,
  LayerPolicyContextError,
  type PublishPolicyContext,
  type BuildPublishPolicyContextOptions,
} from './kernel/event-bus';

// =============================================================================
// Dependency Graph (Iteration 3+)
// =============================================================================

export {
  createDependencyGraph,
  syncRegistryToGraph,
  type DependencyGraph,
  type GraphEdge,
  type GraphNode,
  type SyncRegistryOptions,
} from './kernel/graph';

// =============================================================================
// Metadata System (basic)
// =============================================================================

export {
  createMetadataRegistry,
  type MetadataRegistry,
  type EntityMeta,
  type FieldMeta,
} from './kernel/metadata';

// =============================================================================
// Ports & Adapters (basic)
// =============================================================================

export {
  definePort,
  createAdapter,
  checkContract,
  type Port,
  type Adapter,
  type ContractCheckResult,
} from './kernel/adapters';

// =============================================================================
// AI Code Gate (basic)
// =============================================================================

export {
  createAICodeGate,
  type AICodeGate,
  type AICodeGateResult,
  type AICodeGateViolation,
  type AICodeGateContext,
  type AIGateExtension,
} from './kernel/ai-gate';

// =============================================================================
// Ark Manifest (machine-readable contract export)
// =============================================================================

export {
  createArkManifest,
  type ArkManifest,
  type ArkManifestData,
  type ArkManifestIntent,
  type ArkManifestPolicy,
  type ArkManifestGraph,
  type ArkManifestEntityLink,
  type CreateArkManifestOptions,
  MANIFEST_SCHEMA_VERSION,
} from './kernel/manifest';

// =============================================================================
// Thin Saga / Workflow
// =============================================================================

export { createSaga, type SagaDefinition, type SagaStep, type SagaInstance } from './kernel/workflow';

