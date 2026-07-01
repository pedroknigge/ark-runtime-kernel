import { describe, expect, it } from 'vitest';
import {
  createArkTestHarness,
  createStrictArkKernel,
} from '../../src/index';

describe('v0.5 observability and test harness', () => {
  it('reports declared-vs-observed drift and exposes runtime signals to tests', async () => {
    const ark = createStrictArkKernel({ instanceId: 'kernel-observe' });
    const OrderPlaced = ark.registry.define<'Domain.Order.Placed', { id: string }>(
      'Domain.Order.Placed'
    );
    ark.registry.define<'Application.PlaceOrder', { id: string }>(
      'Application.PlaceOrder',
      { produces: ['Domain.Order.Placed'] }
    );
    ark.registry.define<'Application.CancelOrder', { id: string }>(
      'Application.CancelOrder'
    );
    ark.eventContracts.register({
      intent: 'Domain.Order.Placed',
      version: '1',
      schema: { id: { type: 'string', required: true } },
    });

    const harness = createArkTestHarness(ark);

    await ark.eventBus.publish(OrderPlaced, { id: 'o1' }, {
      source: 'Application.PlaceOrder',
      eventVersion: '1',
    });
    await ark.eventBus.publish(OrderPlaced, { id: 'o2' }, {
      source: 'Application.CancelOrder',
      eventVersion: '1',
    });

    const report = harness.observability();
    expect(report.declaredButUnobserved).toEqual([]);
    expect(report.observedButUndeclared).toContainEqual({
      from: 'Application.CancelOrder',
      to: 'Domain.Order.Placed',
    });
    expect(report.registeredButNeverObserved).toEqual([]);

    const snapshot = await harness.snapshot();
    expect(snapshot.events).toHaveLength(2);
    expect(snapshot.traces.map((record) => record.type)).toContain('event.published');
    expect(snapshot.audit).toHaveLength(2);
    expect(snapshot.outbox).toHaveLength(2);
    expect(snapshot.events[0].metadata.kernelInstanceId).toBe('kernel-observe');

    await harness.clear();
    expect(harness.events()).toEqual([]);
    expect(await harness.audit()).toEqual([]);
    expect(await harness.outbox()).toEqual([]);
  });
});
