import { createAuditTrail } from '../audit';
import { createEventBus } from '../event-bus';
import { createEventContractRegistry } from '../event-contracts';
import { createDependencyGraph, syncRegistryToGraph } from '../graph';
import { createIntentRegistry } from '../intent';
import {
  createArchitectureProfileFromStructrailConfig,
  elevenLayerProfile,
} from '../layers';
import { createStructrailManifest } from '../manifest';
import { createMetadataRegistry } from '../metadata';
import { createObservabilityReporter } from '../observability';
import { InMemoryOutboxStore } from '../outbox';
import {
  PolicyEngine,
  defineArchitectureProfilePolicy,
} from '../policy';
import { createProjectionRegistry } from '../projections';
import { createWorkflowEngine } from '../workflow';
import type {
  StructrailKernel,
  StructrailKernelConfig,
  CreateStructrailKernelFromConfigOptions,
  CreateStructrailKernelOptions,
} from './types';

/**
 * Default cap for in-memory history, trace, and audit records. Without a cap a
 * long-running process grows without bound on every publish. Pass
 * `maxHistorySize: Infinity` to explicitly opt back into unbounded retention.
 */
export const DEFAULT_MAX_HISTORY_SIZE = 1000;

let kernelSequence = 0;

function nextKernelInstanceId(): string {
  kernelSequence += 1;
  return `structrail-kernel-${Date.now()}-${kernelSequence}`;
}

export function createStructrailKernel(
  options: CreateStructrailKernelOptions = {}
): StructrailKernel {
  const strict = options.strict ?? true;
  const instanceId = options.instanceId ?? nextKernelInstanceId();
  const profile = options.profile ?? elevenLayerProfile;
  const maxHistorySize = options.maxHistorySize ?? DEFAULT_MAX_HISTORY_SIZE;
  const registry = createIntentRegistry();
  const graph = createDependencyGraph();
  const metadata = options.metadata ?? createMetadataRegistry();
  const auditTrail = options.auditTrail ?? createAuditTrail({ maxRecords: maxHistorySize });
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
    strictEventContracts: options.strictEventContracts ?? strict,
    requireKnownSource: options.requireKnownSource ?? true,
    architectureProfile: profile,
    enforceObservedLayerFlow:
      options.enforceObservedLayerFlow ?? (strict ? 'hard' : 'off'),
    outbox,
    instanceId,
    maxHistorySize,
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
    publisher(source) {
      return eventBus.createPublisher(source);
    },
    syncGraph,
    manifest() {
      syncGraph();
      return createStructrailManifest({
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

export function createStrictStructrailKernel(
  options: CreateStructrailKernelOptions = {}
): StructrailKernel {
  return createStructrailKernel({
    ...options,
    strict: true,
    strictEventContracts: options.strictEventContracts ?? true,
    requireKnownSource: options.requireKnownSource ?? true,
    enforceObservedLayerFlow: options.enforceObservedLayerFlow ?? 'hard',
  });
}

function createOptionsFromConfig(
  config: StructrailKernelConfig,
  options: CreateStructrailKernelFromConfigOptions = {}
): CreateStructrailKernelOptions {
  const { profileName, ...kernelOptions } = options;
  return {
    ...kernelOptions,
    profile: createArchitectureProfileFromStructrailConfig(config, { name: profileName }),
  };
}

export function createStructrailKernelFromConfig(
  config: StructrailKernelConfig,
  options: CreateStructrailKernelFromConfigOptions = {}
): StructrailKernel {
  return createStructrailKernel(createOptionsFromConfig(config, options));
}

export function createStrictStructrailKernelFromConfig(
  config: StructrailKernelConfig,
  options: CreateStructrailKernelFromConfigOptions = {}
): StructrailKernel {
  return createStrictStructrailKernel(createOptionsFromConfig(config, options));
}

export function createLenientStructrailKernelFromConfig(
  config: StructrailKernelConfig,
  options: CreateStructrailKernelFromConfigOptions = {}
): StructrailKernel {
  return createLenientStructrailKernel(createOptionsFromConfig(config, options));
}

export function createLenientStructrailKernel(
  options: CreateStructrailKernelOptions = {}
): StructrailKernel {
  return createStructrailKernel({
    ...options,
    strict: false,
    strictEventContracts: options.strictEventContracts ?? false,
    enforceObservedLayerFlow: options.enforceObservedLayerFlow ?? 'off',
  });
}

/** @deprecated Use createStructrailKernel. Removal target: v4. */
export const createArkKernel = createStructrailKernel;
/** @deprecated Use createStructrailKernelFromConfig. Removal target: v4. */
export const createArkKernelFromConfig = createStructrailKernelFromConfig;
/** @deprecated Use createStrictStructrailKernel. Removal target: v4. */
export const createStrictArkKernel = createStrictStructrailKernel;
/** @deprecated Use createStrictStructrailKernelFromConfig. Removal target: v4. */
export const createStrictArkKernelFromConfig = createStrictStructrailKernelFromConfig;
/** @deprecated Use createLenientStructrailKernel. Removal target: v4. */
export const createLenientArkKernel = createLenientStructrailKernel;
/** @deprecated Use createLenientStructrailKernelFromConfig. Removal target: v4. */
export const createLenientArkKernelFromConfig = createLenientStructrailKernelFromConfig;
