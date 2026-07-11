import type { AuditTrail } from '../audit';
import type { DependencyGraph } from '../graph';
import type { EventContractRegistry } from '../event-contracts';
import type { IntentRegistry } from '../intent';
import type { ArchitectureProfile, StructrailCheckConfig } from '../layers';
import type { StructrailManifest } from '../manifest';
import type { MetadataRegistry } from '../metadata';
import type { ObservabilityReporter } from '../observability';
import type { Policy, PolicyEngine } from '../policy';
import type { ProjectionRegistry } from '../projections';
import type { EventBus, EventPublisher, ObservedLayerFlowMode } from '../event-bus';
import type { IntentCreator } from '../intent';
import type { IntentName } from '../../domain/types';
import type { OutboxStore } from '../outbox';
import type { WorkflowEngine } from '../workflow';

export interface StructrailKernel {
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
  publisher<N extends IntentName, P>(
    source: N | IntentCreator<N, P>
  ): EventPublisher;
  syncGraph(): void;
  manifest(): StructrailManifest;
}

export interface CreateStructrailKernelOptions {
  /**
   * When true (default), createStructrailKernel uses the hardened runtime defaults:
   * strict event contracts and hard observed-layer enforcement.
   * Set to false only for explicit migration/legacy paths.
   */
  strict?: boolean;
  profile?: ArchitectureProfile;
  policies?: Policy[];
  auditTrail?: AuditTrail;
  eventContracts?: EventContractRegistry;
  outbox?: OutboxStore;
  metadata?: MetadataRegistry;
  projections?: ProjectionRegistry;
  /**
   * Cap for in-memory event history, trace, and audit records.
   * Defaults to DEFAULT_MAX_HISTORY_SIZE (1000); oldest records are evicted
   * first. Pass Infinity for unbounded retention (pre-1.6 behavior).
   */
  maxHistorySize?: number;
  autoApplyProjections?: boolean;
  strictEventContracts?: boolean;
  requireKnownSource?: boolean;
  /**
   * Enforce observed producer→event layer flows against the profile at runtime.
   * Defaults to 'hard' when strict is true and 'off' when strict is false.
   */
  enforceObservedLayerFlow?: ObservedLayerFlowMode;
  instanceId?: string;
}

export interface CreateStructrailKernelFromConfigOptions
  extends Omit<CreateStructrailKernelOptions, 'profile'> {
  /** Runtime profile name. Default: config.name or "structrail.config.json". */
  profileName?: string;
}

export type StructrailKernelConfig = StructrailCheckConfig;

/** @deprecated Use StructrailKernel. Removal target: v4. */
export type ArkKernel = StructrailKernel;
/** @deprecated Use CreateStructrailKernelOptions. Removal target: v4. */
export type CreateArkKernelOptions = CreateStructrailKernelOptions;
/** @deprecated Use CreateStructrailKernelFromConfigOptions. Removal target: v4. */
export type CreateArkKernelFromConfigOptions = CreateStructrailKernelFromConfigOptions;
/** @deprecated Use StructrailKernelConfig. Removal target: v4. */
export type ArkKernelConfig = StructrailKernelConfig;
