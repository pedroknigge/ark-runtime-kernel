import type { DependencyGraph } from '../graph';
import type { IntentRegistry } from '../intent';
import type { EventBus } from '../event-bus';

export interface ObservabilityFlow {
  from: string;
  to: string;
}

export interface ObservabilityDriftReport {
  generatedAt: string;
  declaredProductions: ObservabilityFlow[];
  observedProductions: ObservabilityFlow[];
  declaredButUnobserved: ObservabilityFlow[];
  observedButUndeclared: ObservabilityFlow[];
  unknownSources: ObservabilityFlow[];
  unregisteredObservedSources: string[];
  unregisteredObservedIntents: string[];
  registeredButNeverObserved: string[];
}

export interface ObservabilityReporter {
  report(): ObservabilityDriftReport;
}

export interface CreateObservabilityReporterOptions {
  registry?: IntentRegistry;
  eventBus?: EventBus;
  graph?: DependencyGraph;
}
