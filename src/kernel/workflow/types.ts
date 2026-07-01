/**
 * Thin Saga / Workflow support.
 *
 * Built on top of the Event Bus for coordination.
 * Basic compensating transactions.
 */

import type { EventBus } from '../event-bus';

export interface SagaStep<P = any> {
  name: string;
  onEvent?: string;
  execute: (payload: P, bus: EventBus) => Promise<any>;
  compensate?: (payload: P, bus: EventBus, error?: any) => Promise<void>;
}

export interface SagaDefinition {
  name: string;
  steps: SagaStep[];
}

export interface SagaInstance {
  id: string;
  definition: SagaDefinition;
  run(initialPayload: any): Promise<void>;
}
