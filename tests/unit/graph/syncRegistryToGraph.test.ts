import { describe, it, expect } from 'vitest';
import {
  createIntentRegistry,
  createDependencyGraph,
  syncRegistryToGraph,
} from '../../../src/index';

describe('syncRegistryToGraph', () => {
  it('maps dependsOn to declared edges and produces to produces edges', () => {
    const registry = createIntentRegistry();
    registry.define<'Domain.Order.Placed', {}>('Domain.Order.Placed');
    registry.define<'Application.PlaceOrder', {}>('Application.PlaceOrder', {
      dependsOn: ['Domain.Order.Placed'],
      produces: ['Domain.Order.Placed'],
    });

    const graph = createDependencyGraph();
    syncRegistryToGraph(registry, graph);

    const edges = graph.getEdges();
    expect(edges).toContainEqual({
      from: 'Application.PlaceOrder',
      to: 'Domain.Order.Placed',
      kind: 'declared',
    });
    expect(edges).toContainEqual({
      from: 'Application.PlaceOrder',
      to: 'Domain.Order.Placed',
      kind: 'produces',
    });
  });

  it('can require registered targets', () => {
    const registry = createIntentRegistry();
    registry.define<'Application.X', {}>('Application.X', {
      dependsOn: ['Domain.Missing'],
    });

    const graph = createDependencyGraph();
    syncRegistryToGraph(registry, graph, { requireRegisteredTargets: true });

    expect(graph.getEdges()).toHaveLength(0);
  });
});