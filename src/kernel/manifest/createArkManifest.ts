/**
 * Aggregates kernel registries into a single machine-readable manifest.
 */

import type { IntentRegistry } from '../intent/IntentRegistry';
import type { PolicyEngine } from '../policy/PolicyEngine';
import type { MetadataRegistry } from '../metadata/types';
import type { DependencyGraph } from '../graph/types';
import type { EventContractRegistry } from '../event-contracts';
import type { ArchitectureProfile } from '../layers';
import type { ObservabilityReporter } from '../observability';
import type { ProjectionRegistry } from '../projections';
import type { ArkManifest, ArkManifestData } from './types';
import { version } from '../../version';
import { MANIFEST_SCHEMA_VERSION } from './constants';

function policyId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface CreateArkManifestOptions {
  registry?: IntentRegistry;
  policyEngine?: PolicyEngine;
  metadata?: MetadataRegistry;
  graph?: DependencyGraph;
  profile?: ArchitectureProfile;
  projections?: ProjectionRegistry;
  eventContracts?: EventContractRegistry;
  observability?: ObservabilityReporter;
}

class ArkManifestImpl implements ArkManifest {
  constructor(private readonly data: ArkManifestData) {}

  toJSON(): ArkManifestData {
    return { ...this.data };
  }
}

/**
 * Create a machine-readable snapshot of the current architectural contract.
 * Intended for AI agents, codegen tools, and documentation generators.
 */
export function createArkManifest(
  options: CreateArkManifestOptions = {}
): ArkManifest {
  const registry = options.registry;
  const policyEngine = options.policyEngine;
  const metadata = options.metadata;
  const graph = options.graph;
  const profile = options.profile;
  const projections = options.projections;
  const eventContracts = options.eventContracts;
  const observability = options.observability;

  const intents = registry
    ? registry.list().map((creator) => ({
        name: creator.name,
        dependencies: registry.getDependencies(creator.name),
        productions: registry.getProductions(creator.name),
      }))
    : [];

  const relationships = registry ? registry.getAllRelationships() : [];

  const policies = policyEngine
    ? policyEngine.getPolicies().map((p) => ({
        id: policyId(p.name),
        name: p.name,
        severity: p.severity,
        tags: p.tags ? [...p.tags] : undefined,
        owner: p.owner,
        version: p.version,
        rationale: p.rationale,
        enforcementMode: p.enforcementMode,
        deprecated: p.deprecated,
        replacedBy: p.replacedBy,
        description: p.tags?.includes('layer')
          ? 'Enforces clean-architecture layer dependency rules on declared relationships.'
          : undefined,
      }))
    : [];

  const entities = metadata ? metadata.toJSON() : [];

  const graphData = graph
    ? graph.toJSON()
    : { nodes: [] as ArkManifestData['graph']['nodes'], edges: [] as ArkManifestData['graph']['edges'] };

  const entityIntents = entities
    .filter((e) => (e.emits?.length ?? 0) > 0 || (e.consumes?.length ?? 0) > 0)
    .map((e) => ({
      entity: e.name,
      emits: e.emits,
      consumes: e.consumes,
    }));

  const projectionData = projections
    ? projections.list().map((projection) => ({
        name: projection.name,
        sourceIntents: projection.sourceIntents,
        checkpoint: projections.getCheckpoint(projection.name),
      }))
    : [];

  const data: ArkManifestData = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    version,
    exportedAt: new Date().toISOString(),
    intents,
    relationships,
    policies,
    entities,
    graph: graphData,
    architecture: profile
      ? {
          profile: profile.name,
          layers: profile.layers,
          rules: profile.rules,
        }
      : undefined,
    projections: projectionData,
    eventContracts: eventContracts?.list() ?? [],
    observability: observability?.report(),
    links: { entityIntents },
  };

  return new ArkManifestImpl(data);
}
