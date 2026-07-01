/**
 * Machine-readable manifest types for agent and tooling consumption.
 */

import type { IntentRelationship } from '../intent';
import type { EntityMeta } from '../metadata';
import type { GraphEdge, GraphNode } from '../graph';
import type { ArchitectureLayer, ArchitectureRule } from '../layers';
import type { ProjectionCheckpoint } from '../projections';
import type { EventContract } from '../event-contracts';
import type { PolicyEnforcementMode } from '../policy';

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
  owner?: string;
  version?: string;
  rationale?: string;
  enforcementMode?: PolicyEnforcementMode;
  deprecated?: boolean | string;
  replacedBy?: string;
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

export interface ArkManifestArchitecture {
  profile: string;
  layers: ArchitectureLayer[];
  rules: ArchitectureRule[];
}

export interface ArkManifestProjection {
  name: string;
  sourceIntents: string[];
  checkpoint?: ProjectionCheckpoint;
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
  architecture?: ArkManifestArchitecture;
  projections: ArkManifestProjection[];
  eventContracts: EventContract[];
  /** Cross-registry links for agent contract discovery. */
  links: {
    entityIntents: ArkManifestEntityLink[];
  };
}

export interface ArkManifest {
  toJSON(): ArkManifestData;
}
