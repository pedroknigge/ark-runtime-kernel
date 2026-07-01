import { describe, expect, it } from 'vitest';
import {
  createAuditTrail,
  createProjectionRegistry,
  defineIntent,
  defaultIntentRegistry,
} from '../../../src/index';

describe('ProjectionRegistry', () => {
  it('applies events to read models and tracks checkpoints', async () => {
    defaultIntentRegistry.clear();
    const audit = createAuditTrail();
    const registry = createProjectionRegistry({ auditTrail: audit });
    const OrderPlaced = defineIntent<'Domain.Order.Placed', { id: string }>(
      'Domain.Order.Placed'
    );

    registry.register<string[]>({
      name: 'OrderIds',
      sourceIntents: ['Domain.Order.Placed'],
      initialState: [],
      project: (event, state) => [...state, (event.payload as { id: string }).id],
    });

    await registry.apply(OrderPlaced({ id: 'o1' }));

    expect(await registry.getState<string[]>('OrderIds')).toEqual(['o1']);
    expect(registry.getCheckpoint('OrderIds')?.appliedCount).toBe(1);
    expect(await audit.query({ type: 'projection.applied' })).toHaveLength(1);
  });
});
