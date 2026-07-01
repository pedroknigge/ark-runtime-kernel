import { describe, it, expect } from 'vitest';
import {
  createEventBus,
  createIntentRegistry,
  createDependencyGraph,
  architecturalPolicies,
  UnregisteredIntentError,
  InvalidIntentNameError,
  LayerPolicyContextError,
} from '../../../src/index';

describe('EventBus strict registry enforcement', () => {
  it('rejects publish of unregistered raw events when strictRegistry is enabled', async () => {
    const registry = createIntentRegistry();
    registry.define<'Domain.Order.Placed', { id: string }>('Domain.Order.Placed');

    const bus = createEventBus({ intentRegistry: registry });

    await expect(
      bus.publish({
        intent: 'Domain.Order.Unknown',
        payload: { id: 'x' },
        metadata: { occurredAt: new Date().toISOString(), source: 'test' },
      })
    ).rejects.toThrow(UnregisteredIntentError);
  });

  it('rejects string subscribe to unregistered intents when strictRegistry is enabled', () => {
    const registry = createIntentRegistry();
    registry.define<'Domain.Order.Placed', {}>('Domain.Order.Placed');

    const bus = createEventBus({ intentRegistry: registry });

    expect(() => {
      bus.subscribe('Domain.Order.Missing', () => {});
    }).toThrow(UnregisteredIntentError);
  });

  it('rejects invalid intent naming when validateIntentNaming is enabled', async () => {
    const registry = createIntentRegistry();
    registry.define<'Domain.Order.Placed', {}>('Domain.Order.Placed');

    const bus = createEventBus({ intentRegistry: registry, strictRegistry: false, validateIntentNaming: true });

    await expect(
      bus.publish({
        intent: 'BadIntent' as 'Domain.Order.Placed',
        payload: {},
        metadata: { occurredAt: new Date().toISOString(), source: 'test' },
      })
    ).rejects.toThrow(InvalidIntentNameError);
  });

  it('allows bypass only when strictRegistry is explicitly false', async () => {
    const bus = createEventBus({ strictRegistry: false, validateIntentNaming: false });
    const received: string[] = [];
    bus.subscribe('Domain.AdHoc.Event' as 'Domain.Order.Placed', () => received.push('ok'));

    await bus.publish({
      intent: 'Domain.AdHoc.Event' as 'Domain.Order.Placed',
      payload: {},
      metadata: { occurredAt: new Date().toISOString(), source: 'test' },
    });

    expect(received).toHaveLength(1);
  });

  it('throws LayerPolicyContextError when layer policies lack registry/graph context', () => {
    expect(() =>
      createEventBus({ policies: [architecturalPolicies.cleanArchitectureMatrix()] })
    ).toThrow(LayerPolicyContextError);
  });

  it('supports publish(creator, payload, metadata) three-arg form', async () => {
    const registry = createIntentRegistry();
    const OrderPlaced = registry.define<'Domain.Order.Placed', { id: string }>(
      'Domain.Order.Placed'
    );

    const bus = createEventBus({ intentRegistry: registry });
    await bus.publish(OrderPlaced, { id: 'm1' }, { source: 'Demo.App', correlationId: 'c-1' });

    const history = bus.getHistory();
    expect(history[0].event.metadata.source).toBe('Demo.App');
    expect(history[0].event.metadata.correlationId).toBe('c-1');
  });
});