/**
 * definePolicy
 *
 * Factory function to create architectural policies in a declarative way.
 */

import type { Policy, PolicySeverity, PolicyViolation } from './types';

export interface DefinePolicyOptions<Context = unknown> {
  name: string;
  severity?: PolicySeverity;
  tags?: readonly string[];
  check: (context: Context) => boolean | PolicyViolation | PolicyViolation[];
}

/**
 * Creates a Policy from a declarative configuration.
 *
 * The provided `check` function is called as-is. The PolicyEngine is responsible
 * for normalizing results (booleans, single violations, arrays) into a consistent
 * set of PolicyViolation objects.
 *
 * @example
 * ```ts
 * const noDomainToInfra = definePolicy({
 *   name: 'Domain must not depend on infrastructure',
 *   severity: 'hard',
 *   check: (ctx) => {
 *     const violations: PolicyViolation[] = [];
 *     // ... logic using ctx.registry.getAllRelationships()
 *     return violations.length > 0 ? violations : true;
 *   }
 * });
 * ```
 */
export function definePolicy<Context = unknown>(
  options: DefinePolicyOptions<Context>
): Policy<Context> {
  const severity: PolicySeverity = options.severity ?? 'soft';

  const policy: Policy<Context> = {
    name: options.name,
    severity,
    tags: options.tags,
    check: options.check,
  };

  return policy;
}
