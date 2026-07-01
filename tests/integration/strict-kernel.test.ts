import { describe, expect, it } from 'vitest';
import { createArkKernel } from '../../src/index';

describe('Strict Ark kernel', () => {
  it('wires strict registry, audit, projections, graph, and manifest', async () => {
    const ark = createArkKernel({ maxHistorySize: 50 });
    const OrderPlaced = ark.registry.define<'Domain.Order.Placed', { id: string }>(
      'Domain.Order.Placed'
    );
    ark.registry.define<'Application.PlaceOrder', { id: string }>(
      'Application.PlaceOrder',
      { produces: ['Domain.Order.Placed'] }
    );

    ark.projections.register<string[]>({
      name: 'OrderReadModel',
      sourceIntents: ['Domain.Order.Placed'],
      initialState: [],
      project: (event, state) => [...state, (event.payload as { id: string }).id],
    });

    await ark.eventBus.publish(OrderPlaced, { id: 'o1' }, {
      source: 'Application.PlaceOrder',
      correlationId: 'corr-1',
      traceId: 'trace-1',
    });

    expect(await ark.projections.getState<string[]>('OrderReadModel')).toEqual(['o1']);
    expect(await ark.auditTrail.query({ type: 'event.published' })).toHaveLength(1);

    const manifest = ark.manifest().toJSON();
    expect(manifest.architecture?.layers).toHaveLength(11);
    expect(manifest.projections[0].name).toBe('OrderReadModel');
    expect(manifest.graph.edges).toContainEqual({
      from: 'Application.PlaceOrder',
      to: 'Domain.Order.Placed',
      kind: 'produces',
    });
  });
});
