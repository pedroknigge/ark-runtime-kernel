/**
 * Helpers for building policy evaluation context on event publish.
 */

import type { DomainEvent } from '../../domain/types';
import type { IntentRegistry } from '../intent/IntentRegistry';
import type { IntentRelationship } from '../intent';
import type { DependencyGraph, GraphEdge } from '../graph';

/**
 * Standard context for policies evaluated during event publish.
 * Includes the event plus optional registry relationships and graph edges
 * so layer policies (e.g. architecturalPolicies.layerIsolation) can run.
 */
export interface PublishPolicyContext {
  event: DomainEvent;
  relationships?: IntentRelationship[];
  edges?: GraphEdge[];
}

export interface BuildPublishPolicyContextOptions {
  intentRegistry?: IntentRegistry;
  dependencyGraph?: DependencyGraph;
}

/**
 * Build a getPolicyContext function that feeds registry + graph data to policies.
 *
 * @example
 * ```ts
 * const bus = createEventBus({
 *   intentRegistry: registry,
 *   dependencyGraph: graph,
 *   policies: [architecturalPolicies.layerIsolation()],
 * });
 * ```
 */
export function buildPublishPolicyContext(
  options: BuildPublishPolicyContextOptions
): (event: DomainEvent) => PublishPolicyContext {
  return (event: DomainEvent) => ({
    event,
    relationships: options.intentRegistry?.getAllRelationships(),
    edges: options.dependencyGraph?.getEdges(),
  });
}