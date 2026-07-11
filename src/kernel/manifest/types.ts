/**
 * Machine-readable manifest types for agent and tooling consumption.
 */

import type { IntentRelationship } from '../intent';
import type { EntityMeta } from '../metadata';
import type { GraphEdge, GraphNode } from '../graph';
import type { ArchitectureLayer, ArchitectureRule } from '../layers';
import type { ProjectionCheckpoint } from '../projections';
import type { EventContract } from '../event-contracts';
import type { ObservabilityDriftReport } from '../observability';
import type { PolicyEnforcementMode } from '../policy';

export interface StructrailManifestIntent {
  name: string;
  dependencies: string[];
  productions: string[];
}

export interface StructrailManifestPolicy {
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

export interface StructrailManifestEntityLink {
  entity: string;
  emits?: string[];
  consumes?: string[];
}

export interface StructrailManifestGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface StructrailManifestArchitecture {
  profile: string;
  layers: ArchitectureLayer[];
  rules: ArchitectureRule[];
}

export interface StructrailManifestProjection {
  name: string;
  sourceIntents: string[];
  checkpoint?: ProjectionCheckpoint;
}

export interface StructrailManifestData {
  /** Manifest schema version for agent/tooling compatibility. */
  schemaVersion: string;
  version: string;
  exportedAt: string;
  intents: StructrailManifestIntent[];
  relationships: IntentRelationship[];
  policies: StructrailManifestPolicy[];
  entities: EntityMeta[];
  graph: StructrailManifestGraph;
  architecture?: StructrailManifestArchitecture;
  projections: StructrailManifestProjection[];
  eventContracts: EventContract[];
  observability?: ObservabilityDriftReport;
  /** Cross-registry links for agent contract discovery. */
  links: {
    entityIntents: StructrailManifestEntityLink[];
  };
}

export interface StructrailManifest {
  toJSON(): StructrailManifestData;
}

/** @deprecated Use StructrailManifestIntent. Removal target: v4. */
export type ArkManifestIntent = StructrailManifestIntent;
/** @deprecated Use StructrailManifestPolicy. Removal target: v4. */
export type ArkManifestPolicy = StructrailManifestPolicy;
/** @deprecated Use StructrailManifestEntityLink. Removal target: v4. */
export type ArkManifestEntityLink = StructrailManifestEntityLink;
/** @deprecated Use StructrailManifestGraph. Removal target: v4. */
export type ArkManifestGraph = StructrailManifestGraph;
/** @deprecated Use StructrailManifestArchitecture. Removal target: v4. */
export type ArkManifestArchitecture = StructrailManifestArchitecture;
/** @deprecated Use StructrailManifestProjection. Removal target: v4. */
export type ArkManifestProjection = StructrailManifestProjection;
/** @deprecated Use StructrailManifestData. Removal target: v4. */
export type ArkManifestData = StructrailManifestData;
/** @deprecated Use StructrailManifest. Removal target: v4. */
export type ArkManifest = StructrailManifest;
