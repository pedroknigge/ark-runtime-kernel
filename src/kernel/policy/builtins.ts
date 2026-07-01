/**
 * Built-in architectural policy helpers.
 */

import type { Policy, PolicyViolation } from './types';
import type { IntentRelationship } from '../intent';
import type { GraphEdge } from '../graph';
import type { ArchitectureProfile } from '../layers';
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
  resolveLayer?: (name: string) => string | undefined;
}

function defaultLayerOf(name: string): string {
  const dot = name.indexOf('.');
  return dot >= 0 ? name.slice(0, dot) : name;
}

function resolveLayer(name: string, options: LayerPolicyOptions): string {
  return options.resolveLayer?.(name) ?? defaultLayerOf(name);
}

function matchesRule(
  fromLayer: string,
  toLayer: string,
  rule: LayerFlowRule
): boolean {
  return fromLayer === rule.from && toLayer === rule.to;
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
        const fromLayer = resolveLayer(edge.from, options);
        const toLayer = resolveLayer(edge.to, options);

        for (const rule of options.rules) {
          if (!rule.allowed && matchesRule(fromLayer, toLayer, rule)) {
            violations.push({
              policyName: name,
              severity,
              message:
                rule.message ??
                `Layer violation: ${edge.from} (${fromLayer}) must not relate to ${edge.to} (${toLayer})`,
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

export function defineArchitectureProfilePolicy<
  Context extends { edges?: GraphEdge[]; relationships?: IntentRelationship[] },
>(profile: ArchitectureProfile, options: Omit<LayerPolicyOptions, 'rules' | 'resolveLayer'> = {}): Policy<Context> {
  return defineLayerPolicy<Context>({
    name: options.name ?? `${profile.name} layer policy`,
    severity: options.severity ?? 'hard',
    rules: profile.rules,
    resolveLayer: profile.resolveLayer,
  });
}
