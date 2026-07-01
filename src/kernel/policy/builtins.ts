/**
 * Built-in architectural policy helpers.
 */

import type { Policy, PolicyViolation } from './types';
import type { IntentRelationship } from '../intent';
import type { GraphEdge } from '../graph';
import { definePolicy } from './definePolicy';

export interface LayerFlowRule {
  from: string;
  to: string;
  allowed: boolean;
  message?: string;
}

export interface LayerPolicyOptions {
  name?: string;
  severity?: 'hard' | 'soft';
  /** Prefix rules — e.g. { from: 'Domain', to: 'Adapter', allowed: false } */
  rules: LayerFlowRule[];
}

function layerOf(name: string): string {
  const dot = name.indexOf('.');
  return dot >= 0 ? name.slice(0, dot) : name;
}

function matchesRule(from: string, to: string, rule: LayerFlowRule): boolean {
  return layerOf(from) === rule.from && layerOf(to) === rule.to;
}

/**
 * Create a policy that enforces layer-crossing rules on graph edges or intent relationships.
 */
export function defineLayerPolicy<Context extends { edges?: GraphEdge[]; relationships?: IntentRelationship[] }>(
  options: LayerPolicyOptions
): Policy<Context> {
  const name = options.name ?? 'Layer isolation';
  const severity = options.severity ?? 'hard';

  return definePolicy<Context>({
    name,
    severity,
    tags: ['layer'],
    check: (ctx) => {
      // Only architectural dependencies — not observed event flows (Domain→Application consumers).
      const edges: Array<{ from: string; to: string }> = [
        ...(ctx.edges ?? [])
          .filter((e) => e.kind === 'declared' || e.kind === 'produces')
          .map((e) => ({ from: e.from, to: e.to })),
        ...(ctx.relationships ?? [])
          .filter((r) => r.kind === 'dependsOn')
          .map((r) => ({ from: r.from, to: r.to })),
      ];

      const violations: PolicyViolation[] = [];

      for (const edge of edges) {
        for (const rule of options.rules) {
          if (!rule.allowed && matchesRule(edge.from, edge.to, rule)) {
            violations.push({
              policyName: name,
              severity,
              message:
                rule.message ??
                `Layer violation: ${edge.from} (${layerOf(edge.from)}) must not relate to ${edge.to} (${layerOf(edge.to)})`,
            });
          }
        }
      }

      return violations.length > 0 ? violations : true;
    },
  });
}

/** True when a policy requires graph/registry context to enforce layer rules. */
export function isLayerPolicy(policy: Policy): boolean {
  return policy.tags?.includes('layer') ?? false;
}

/** Preset architectural policy factories. */
export const architecturalPolicies = {
  /**
   * @deprecated Use cleanArchitectureMatrix() for full layer rules.
   * Blocks Domain → Adapter declared dependencies only.
   */
  layerIsolation(): Policy<{ edges?: GraphEdge[]; relationships?: IntentRelationship[] }> {
    return architecturalPolicies.cleanArchitectureMatrix();
  },

  /**
   * Clean-architecture dependency matrix (declared dependsOn / declared edges only).
   * Does not block observed event flows (Domain events consumed by Application).
   */
  cleanArchitectureMatrix(): Policy<{
    edges?: GraphEdge[];
    relationships?: IntentRelationship[];
  }> {
    return defineLayerPolicy({
      name: 'Clean architecture matrix',
      severity: 'hard',
      rules: [
        { from: 'Domain', to: 'Adapter', allowed: false },
        { from: 'Domain', to: 'Application', allowed: false },
        { from: 'Adapter', to: 'Application', allowed: false },
        { from: 'Adapter', to: 'Domain', allowed: false },
      ],
    });
  },
};