import type {
  ArchitectureLayer,
  ArchitectureProfile,
  ArchitectureRule,
  CreateArchitectureProfileOptions,
} from './types';

function normalizePrefix(prefix: string): string {
  return prefix.endsWith('.') ? prefix : `${prefix}.`;
}

function byLongestPrefix(a: ArchitectureLayer, b: ArchitectureLayer): number {
  const maxA = Math.max(...a.prefixes.map((p) => p.length));
  const maxB = Math.max(...b.prefixes.map((p) => p.length));
  return maxB - maxA;
}

export function createArchitectureProfile(
  options: CreateArchitectureProfileOptions
): ArchitectureProfile {
  const layers = options.layers.map((layer) => ({
    ...layer,
    prefixes: layer.prefixes.map(normalizePrefix),
  }));
  const sortedLayers = [...layers].sort(byLongestPrefix);
  const rules: ArchitectureRule[] = [...(options.rules ?? [])];

  return {
    name: options.name,
    layers,
    rules,
    resolveLayer(name: string): string | undefined {
      return sortedLayers.find((layer) =>
        layer.prefixes.some((prefix) => name.startsWith(prefix))
      )?.name;
    },
  };
}

export const elevenLayerProfile = createArchitectureProfile({
  name: 'Ark 11-layer Hexagonal Event-Driven Profile',
  layers: [
    {
      name: 'DomainModel',
      prefixes: ['Domain'],
      description: 'Rich domain model, business rules, and domain events.',
      order: 1,
    },
    {
      name: 'ApplicationOrchestration',
      prefixes: ['Application'],
      description: 'Use cases and command orchestration.',
      order: 2,
    },
    {
      name: 'PersistenceAdapters',
      prefixes: ['Adapter.Persistence', 'Adapter.Repository'],
      description: 'Database, repository, and storage adapters.',
      order: 3,
    },
    {
      name: 'IntegrationAdapters',
      prefixes: ['Adapter.Integration', 'Adapter.External'],
      description: 'External systems, APIs, and integration adapters.',
      order: 4,
    },
    {
      name: 'WorkflowSagaEngine',
      prefixes: ['Workflow'],
      description: 'Sagas, workflows, and long-running processes.',
      order: 5,
    },
    {
      name: 'BackgroundJobsScheduling',
      prefixes: ['Job'],
      description: 'Background jobs, scheduled work, and async processors.',
      order: 6,
    },
    {
      name: 'PresentationAdapters',
      prefixes: ['Presentation', 'Adapter.Presentation', 'Adapter.Api'],
      description: 'API, UI, controller, and presentation adapters.',
      order: 7,
    },
    {
      name: 'ReportingReadModels',
      prefixes: ['Reporting'],
      description: 'Read models, projections, and reporting surfaces.',
      order: 8,
    },
    {
      name: 'ExtensibilityMetadata',
      prefixes: ['Metadata'],
      description: 'Metadata, extensions, and schema contracts.',
      order: 9,
    },
    {
      name: 'SecurityAuditObservability',
      prefixes: ['Security', 'Audit', 'Observability'],
      description: 'Security, audit, and observability concerns.',
      order: 10,
    },
    {
      name: 'Kernel',
      prefixes: ['Kernel'],
      description: 'Ark-owned governance and kernel signals.',
      order: 11,
    },
  ],
  rules: [
    { from: 'DomainModel', to: 'ApplicationOrchestration', allowed: false },
    { from: 'DomainModel', to: 'PersistenceAdapters', allowed: false },
    { from: 'DomainModel', to: 'IntegrationAdapters', allowed: false },
    { from: 'DomainModel', to: 'WorkflowSagaEngine', allowed: false },
    { from: 'DomainModel', to: 'BackgroundJobsScheduling', allowed: false },
    { from: 'DomainModel', to: 'PresentationAdapters', allowed: false },
    { from: 'DomainModel', to: 'ReportingReadModels', allowed: false },
    { from: 'DomainModel', to: 'SecurityAuditObservability', allowed: false },
    { from: 'PersistenceAdapters', to: 'ApplicationOrchestration', allowed: false },
    { from: 'PersistenceAdapters', to: 'DomainModel', allowed: false },
    { from: 'IntegrationAdapters', to: 'ApplicationOrchestration', allowed: false },
    { from: 'IntegrationAdapters', to: 'DomainModel', allowed: false },
    { from: 'PresentationAdapters', to: 'PersistenceAdapters', allowed: false },
    { from: 'ReportingReadModels', to: 'PersistenceAdapters', allowed: false },
  ],
});
