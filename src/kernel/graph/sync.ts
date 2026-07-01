/**
 * Bridge IntentRegistry relationships into a DependencyGraph.
 */

import type { IntentRegistry } from '../intent/IntentRegistry';
import type { DependencyGraph } from './types';

export interface SyncRegistryOptions {
  /** Skip edges whose target intent is not registered (default: false). */
  requireRegisteredTargets?: boolean;
}

/**
 * Sync declared intent relationships from a registry into a dependency graph.
 *
 * - `dependsOn` → `declared` edges
 * - `produces` → `produces` edges
 */
export function syncRegistryToGraph(
  registry: IntentRegistry,
  graph: DependencyGraph,
  options: SyncRegistryOptions = {}
): void {
  const requireRegistered = options.requireRegisteredTargets ?? false;

  for (const rel of registry.getAllRelationships()) {
    if (requireRegistered && !registry.has(rel.to)) {
      continue;
    }

    if (rel.kind === 'dependsOn') {
      graph.registerDependency(rel.from, rel.to, 'declared');
    } else {
      graph.registerDependency(rel.from, rel.to, 'produces');
    }
  }
}