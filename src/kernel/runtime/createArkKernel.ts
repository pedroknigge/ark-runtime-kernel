import { createAuditTrail } from '../audit';
import { createEventBus } from '../event-bus';
import { createEventContractRegistry } from '../event-contracts';
import { createDependencyGraph, syncRegistryToGraph } from '../graph';
import { createIntentRegistry } from '../intent';
import { elevenLayerProfile } from '../layers';
import { createArkManifest } from '../manifest';
import { createMetadataRegistry } from '../metadata';
import { createObservabilityReporter } from '../observability';
import { InMemoryOutboxStore } from '../outbox';
import {
  PolicyEngine,
  defineArchitectureProfilePolicy,
} from '../policy';
import { createProjectionRegistry } from '../projections';
import { createWorkflowEngine } from '../workflow';
import type { ArkKernel, CreateArkKernelOptions } from './types';

let kernelSequence = 0;

function nextKernelInstanceId(): string {
  kernelSequence += 1;
  return `ark-kernel-${Date.now()}-${kernelSequence}`;
}

export function createArkKernel(options: CreateArkKernelOptions = {}): ArkKernel {
  const instanceId = options.instanceId ?? nextKernelInstanceId();
  const profile = options.profile ?? elevenLayerProfile;
  const registry = createIntentRegistry();
  const graph = createDependencyGraph();
  const metadata = options.metadata ?? createMetadataRegistry();
  const auditTrail = options.auditTrail ?? createAuditTrail({ maxRecords: options.maxHistorySize });
  const eventContracts = options.eventContracts ?? createEventContractRegistry();
  const outbox = options.outbox ?? new InMemoryOutboxStore();
  const projections =
    options.projections ?? createProjectionRegistry({ auditTrail });
  const policyEngine = new PolicyEngine([
    defineArchitectureProfilePolicy(profile),
    ...(options.policies ?? []),
  ]);

  const syncGraph = () => {
    syncRegistryToGraph(registry, graph, { requireRegisteredTargets: true });
  };

  const eventBus = createEventBus({
    intentRegistry: registry,
    dependencyGraph: graph,
    policyEngine,
    strictRegistry: true,
    validateIntentNaming: true,
    auditTrail,
    eventContracts,
    strictEventContracts: options.strictEventContracts ?? false,
    requireKnownSource: options.requireKnownSource ?? true,
    outbox,
    instanceId,
    maxHistorySize: options.maxHistorySize,
    onPublish: options.autoApplyProjections === false
      ? undefined
      : async (event) => {
          await projections.apply(event);
        },
  });

  const workflowEngine = createWorkflowEngine(eventBus, { auditTrail });
  const observability = createObservabilityReporter({
    registry,
    eventBus,
    graph,
  });

  return {
    instanceId,
    profile,
    registry,
    graph,
    metadata,
    auditTrail,
    eventContracts,
    outbox,
    projections,
    policyEngine,
    eventBus,
    workflowEngine,
    observability,
    syncGraph,
    manifest() {
      syncGraph();
      return createArkManifest({
        registry,
        policyEngine,
        metadata,
        graph,
        profile,
        projections,
        eventContracts,
        observability,
      });
    },
  };
}

export function createStrictArkKernel(
  options: CreateArkKernelOptions = {}
): ArkKernel {
  return createArkKernel({
    ...options,
    strictEventContracts: true,
    requireKnownSource: true,
  });
}
