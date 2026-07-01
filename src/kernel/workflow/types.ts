/**
 * Thin Saga / Workflow support.
 *
 * Built on top of the Event Bus for coordination.
 * Basic compensating transactions.
 */

import type { EventBus } from '../event-bus';

export type SagaContext = Record<string, unknown>;

export interface SagaStep<P extends SagaContext = SagaContext> {
  name: string;
  onEvent?: string;
  execute: (payload: P, bus: EventBus) => Promise<Partial<P> | void>;
  compensate?: (payload: P, bus: EventBus, error?: unknown) => Promise<void>;
}

export interface SagaDefinition<P extends SagaContext = SagaContext> {
  name: string;
  steps: SagaStep<P>[];
}

export interface SagaInstance<P extends SagaContext = SagaContext> {
  id: string;
  definition: SagaDefinition<P>;
  run(initialPayload: P): Promise<void>;
}
