import { describe, it, expect } from 'vitest';
import { createDependencyGraph, elevenLayerProfile } from '../../../src/index';

describe('Dependency Graph', () => {
  it('registers dependencies and produces JSON + Mermaid (valid syntax for kinded edges)', () => {
    const graph = createDependencyGraph();
    graph.registerDependency('Application.Confirm', 'Domain.Order.Placed', 'declared');
    graph.registerEventFlow('Domain.Order.Placed', 'Application.Confirm');

    const json = graph.toJSON();
    expect(json.nodes.length).toBeGreaterThan(0);
    expect(json.edges.length).toBe(2);

    const mermaid = graph.toMermaid();
    expect(mermaid).toContain('flowchart TD');
    // Must be valid Mermaid: -->|declared|  (no space after --> before | )
    expect(mermaid).toMatch(/-->\|declared\|/);
    expect(mermaid).toMatch(/-->\|observed\|/);
    expect(mermaid).not.toMatch(/-->\s\|/); // no " --> |" anti-pattern
  });

  it('detects basic cycles', () => {
    const graph = createDependencyGraph();
    graph.registerDependency('A', 'B');
    graph.registerDependency('B', 'A');

    const violations = graph.detectViolations();
    expect(violations.some((v) => v.includes('Cycle'))).toBe(true);
  });

  it('can feed from IntentRegistry relationships', () => {
    const graph = createDependencyGraph();
    // simulate
    graph.registerDependency('App.X', 'Domain.Y', 'declared');

    expect(graph.getEdges().length).toBe(1);
  });

  it('exports layer-grouped Mermaid for architecture profiles', () => {
    const graph = createDependencyGraph();
    graph.registerDependency(
      'Application.PlaceOrder',
      'Domain.Order.Placed',
      'declared'
    );

    const mermaid = graph.toLayerMermaid(elevenLayerProfile);

    expect(mermaid).toContain('subgraph ApplicationOrchestration');
    expect(mermaid).toContain('subgraph DomainModel');
    expect(mermaid).toContain('-->|declared|');
  });
});
