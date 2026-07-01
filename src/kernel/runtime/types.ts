import type { AuditTrail } from '../audit';
import type { DependencyGraph } from '../graph';
import type { EventContractRegistry } from '../event-contracts';
import type { IntentRegistry } from '../intent';
import type { ArchitectureProfile } from '../layers';
import type { ArkManifest } from '../manifest';
import type { MetadataRegistry } from '../metadata';
import type { ObservabilityReporter } from '../observability';
import type { Policy, PolicyEngine } from '../policy';
import type { ProjectionRegistry } from '../projections';
import type { EventBus } from '../event-bus';
import type { OutboxStore } from '../outbox';
import type { WorkflowEngine } from '../workflow';

export interface ArkKernel {
  instanceId: string;
  profile: ArchitectureProfile;
  registry: IntentRegistry;
  graph: DependencyGraph;
  metadata: MetadataRegistry;
  auditTrail: AuditTrail;
  eventContracts: EventContractRegistry;
  outbox: OutboxStore;
  projections: ProjectionRegistry;
  policyEngine: PolicyEngine;
  eventBus: EventBus;
  workflowEngine: WorkflowEngine;
  observability: ObservabilityReporter;
  syncGraph(): void;
  manifest(): ArkManifest;
}

export interface CreateArkKernelOptions {
  profile?: ArchitectureProfile;
  policies?: Policy[];
  auditTrail?: AuditTrail;
  eventContracts?: EventContractRegistry;
  outbox?: OutboxStore;
  metadata?: MetadataRegistry;
  projections?: ProjectionRegistry;
  maxHistorySize?: number;
  autoApplyProjections?: boolean;
  strictEventContracts?: boolean;
  requireKnownSource?: boolean;
  instanceId?: string;
}
