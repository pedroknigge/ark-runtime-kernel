/**
 * Machine-readable manifest types for agent and tooling consumption.
 */

import type { IntentRelationship } from '../intent';
import type { EntityMeta } from '../metadata';
import type { GraphEdge, GraphNode } from '../graph';

export interface ArkManifestIntent {
  name: string;
  dependencies: string[];
  productions: string[];
}

export interface ArkManifestPolicy {
  /** Stable slug for agents (derived from policy name). */
  id: string;
  name: string;
  severity: 'hard' | 'soft';
  tags?: string[];
  description?: string;
}

export interface ArkManifestEntityLink {
  entity: string;
  emits?: string[];
  consumes?: string[];
}

export interface ArkManifestGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ArkManifestData {
  /** Manifest schema version for agent/tooling compatibility. */
  schemaVersion: string;
  version: string;
  exportedAt: string;
  intents: ArkManifestIntent[];
  relationships: IntentRelationship[];
  policies: ArkManifestPolicy[];
  entities: EntityMeta[];
  graph: ArkManifestGraph;
  /** Cross-registry links for agent contract discovery. */
  links: {
    entityIntents: ArkManifestEntityLink[];
  };
}

export interface ArkManifest {
  toJSON(): ArkManifestData;
}