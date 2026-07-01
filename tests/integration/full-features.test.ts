import { describe, it, expect } from 'vitest';
import {
  createIntentRegistry,
  createEventBus,
  definePolicy,
  createDependencyGraph,
  syncRegistryToGraph,
  createMetadataRegistry,
  createArkManifest,
  createAICodeGate,
  createSaga,
  definePort,
  createAdapter,
  checkContract,
  architecturalPolicies,
  PolicyEngine,
  PolicyViolationError,
} from '../../src/index';

describe('Integration: multiple core features', () => {
  it('exercises manifest, sync, trace, layer policies, AI gate, and PolicyViolationError', async () => {
    const registry = createIntentRegistry();
    const OrderPlaced = registry.define<'Domain.Order.Placed', { id: string; amt: number }>(
      'Domain.Order.Placed'
    );
    registry.define<'Application.Place', { id: string }>('Application.Place', {
      dependsOn: ['Domain.Order.Placed'],
      produces: ['Domain.Order.Placed'],
    });

    const graph = createDependencyGraph();
    syncRegistryToGraph(registry, graph);

    const policyEngine = new PolicyEngine([
      definePolicy({
        name: 'amt-positive',
        severity: 'hard',
        check: (c: { event: { payload: { amt: number } } }) =>
          c.event.payload.amt > 0,
      }),
      architecturalPolicies.cleanArchitectureMatrix(),
    ]);

    const bus = createEventBus({
      policyEngine,
      intentRegistry: registry,
      dependencyGraph: graph,
      maxHistorySize: 10,
      strictRegistry: true,
    });

    const received: Array<{ id: string; amt: number }> = [];
    bus.subscribe(OrderPlaced, (e) => received.push(e.payload));

    await bus.publish(OrderPlaced, { id: 'i1', amt: 10 });

    const meta = createMetadataRegistry();
    meta.entity('Order', { fields: { id: { type: 'string' } } });

    const manifest = createArkManifest({
      registry,
      policyEngine,
      metadata: meta,
      graph,
    });
    const manifestData = manifest.toJSON();
    expect(manifestData.schemaVersion).toBe('1.0');
    expect(manifestData.intents.length).toBe(2);
    expect(manifestData.policies[0].id).toBeDefined();
    expect(manifestData.relationships.some((r) => r.kind === 'produces')).toBe(true);

    const gate = createAICodeGate({ intents: registry.list() });
    const badCode = `bus.publish('Domain.Order.Unknown', {});`;
    expect(gate.validate(badCode).valid).toBe(false);
    const goodCode = `bus.publish('Domain.Order.Placed', { id: '1', amt: 1 });`;
    expect(gate.validate(goodCode).valid).toBe(true);

    expect(bus.getTrace().some((t) => t.type === 'event.published')).toBe(true);

    // layer policy blocks forbidden relationships in registry context
    registry.declareDependency('Domain.Bad', 'Adapter.Infra');
    try {
      await bus.publish(OrderPlaced, { id: 'i2', amt: 5 });
      expect.fail('should have thrown PolicyViolationError');
    } catch (err) {
      expect(err).toBeInstanceOf(PolicyViolationError);
    }

    interface TestRepo {
      find(id: string): { id: string };
    }
    const repoPort = definePort<TestRepo>('TestRepo');
    const impl = { find: (id: string) => ({ id }) };
    const adapter = createAdapter(repoPort, impl, ['find']);
    const contractCheck = checkContract(impl, ['find']);
    expect(contractCheck.ok).toBe(true);
    expect(adapter.impl.find('x').id).toBe('x');

    const saga = createSaga(
      {
        name: 'demo',
        steps: [{ name: 's1', execute: async () => ({ done: true }) }],
      },
      bus
    );
    await saga.run({});

    expect(received.length).toBe(1);
    expect(graph.getEdges().length).toBeGreaterThan(0);
    expect(meta.listEntities().length).toBe(1);
  });
});