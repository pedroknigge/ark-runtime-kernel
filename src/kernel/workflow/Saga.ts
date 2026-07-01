/**
 * Minimal in-memory Saga orchestrator using the EventBus.
 */

import type { EventBus } from '../event-bus';
import type { SagaContext, SagaDefinition, SagaInstance } from './types';

export function createSaga<P extends SagaContext = SagaContext>(
  def: SagaDefinition<P>,
  bus: EventBus
): SagaInstance<P> {
  return {
    id: `saga-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    definition: def,
    async run(initialPayload: P) {
      const context: P = { ...initialPayload };
      for (const step of def.steps) {
        try {
          const result = await step.execute(context, bus);
          if (result) Object.assign(context, result);
        } catch (err) {
          // compensate backwards
          for (let i = def.steps.indexOf(step) - 1; i >= 0; i--) {
            const prev = def.steps[i];
            if (prev.compensate) {
              try {
                await prev.compensate(context, bus, err);
              } catch (_) {
                /* best effort */
              }
            }
          }
          throw err;
        }
      }
    },
  };
}
