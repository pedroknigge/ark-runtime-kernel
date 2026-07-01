import type {
  CreateObservabilityReporterOptions,
  ObservabilityDriftReport,
  ObservabilityFlow,
  ObservabilityReporter,
} from './types';

function flowKey(flow: ObservabilityFlow): string {
  return `${flow.from}->${flow.to}`;
}

function uniqueFlows(flows: ObservabilityFlow[]): ObservabilityFlow[] {
  const seen = new Set<string>();
  const result: ObservabilityFlow[] = [];
  for (const flow of flows) {
    const key = flowKey(flow);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(flow);
  }
  return result;
}

function difference(left: ObservabilityFlow[], right: ObservabilityFlow[]): ObservabilityFlow[] {
  const rightKeys = new Set(right.map(flowKey));
  return left.filter((flow) => !rightKeys.has(flowKey(flow)));
}

export function createObservabilityReporter(
  options: CreateObservabilityReporterOptions
): ObservabilityReporter {
  const registry = options.registry;
  const eventBus = options.eventBus;
  const graph = options.graph;

  return {
    report(): ObservabilityDriftReport {
      const declaredFromRegistry = registry
        ? registry
            .getAllRelationships()
            .filter((relationship) => relationship.kind === 'produces')
            .map((relationship) => ({
              from: relationship.from,
              to: relationship.to,
            }))
        : [];

      const declaredFromGraph =
        declaredFromRegistry.length > 0 || !graph
          ? []
          : graph
              .getEdges()
              .filter((edge) => edge.kind === 'produces')
              .map((edge) => ({ from: edge.from, to: edge.to }));

      const observedFromHistory =
        eventBus?.getHistory().map((record) => ({
          from: record.event.metadata.source,
          to: record.event.intent,
        })) ?? [];

      const observedFromGraph =
        observedFromHistory.length > 0 || !graph
          ? []
          : graph
              .getEdges()
              .filter((edge) => edge.kind === 'observed')
              .map((edge) => ({ from: edge.from, to: edge.to }));

      const declaredProductions = uniqueFlows([
        ...declaredFromRegistry,
        ...declaredFromGraph,
      ]);
      const observedProductions = uniqueFlows([
        ...observedFromHistory,
        ...observedFromGraph,
      ]);
      const unknownSources = observedProductions.filter(
        (flow) => !flow.from || flow.from === 'unknown'
      );

      const unregisteredObservedSources = registry
        ? Array.from(
            new Set(
              observedProductions
                .map((flow) => flow.from)
                .filter(
                  (source) =>
                    source &&
                    source !== 'unknown' &&
                    !registry.has(source)
                )
            )
          )
        : [];

      const unregisteredObservedIntents = registry
        ? Array.from(
            new Set(
              observedProductions
                .map((flow) => flow.to)
                .filter((intent) => !registry.has(intent))
            )
          )
        : [];

      const observedIntentNames = new Set(
        observedProductions.flatMap((flow) => [flow.from, flow.to])
      );
      const registeredButNeverObserved = registry
        ? registry
            .list()
            .map((intent) => intent.name)
            .filter((intent) => !observedIntentNames.has(intent))
        : [];

      return {
        generatedAt: new Date().toISOString(),
        declaredProductions,
        observedProductions,
        declaredButUnobserved: difference(declaredProductions, observedProductions),
        observedButUndeclared: difference(
          observedProductions.filter((flow) => flow.from !== 'unknown'),
          declaredProductions
        ),
        unknownSources,
        unregisteredObservedSources,
        unregisteredObservedIntents,
        registeredButNeverObserved,
      };
    },
  };
}
