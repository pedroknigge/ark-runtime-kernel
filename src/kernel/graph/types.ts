/**
 * Dependency Graph types.
 *
 * Used to model declared + observed relationships between intents,
 * and to generate visualizations (Mermaid) and detect violations.
 */

import type { ArchitectureProfile } from '../layers';

export interface GraphEdge {
  from: string;
  to: string;
  kind?: 'declared' | 'observed' | 'produces';
}

export interface GraphNode {
  id: string;
  kind?: string;
}

export interface DependencyGraph {
  /**
   * Register a declared dependency between two semantic names.
   */
  registerDependency(from: string, to: string, kind?: GraphEdge['kind']): void;

  /**
   * Register an observed event flow (producer -> consumer).
   */
  registerEventFlow(producer: string, consumer: string): void;

  /**
   * Return all nodes.
   */
  getNodes(): GraphNode[];

  /**
   * Return all edges.
   */
  getEdges(): GraphEdge[];

  /**
   * Export as JSON.
   */
  toJSON(): { nodes: GraphNode[]; edges: GraphEdge[] };

  /**
   * Export as Mermaid flowchart.
   */
  toMermaid(): string;

  /**
   * Export as Mermaid flowchart grouped into profile layers.
   */
  toLayerMermaid(profile: ArchitectureProfile): string;

  /**
   * Detect violations by running provided policies or simple rules.
   * For simplicity here we accept predicates that return violation messages.
   */
  detectViolations(
    rules?: Array<(edges: GraphEdge[]) => string[]>
  ): string[];
}
