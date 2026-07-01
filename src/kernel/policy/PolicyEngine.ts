/**
 * PolicyEngine
 *
 * Evaluates collections of policies against a context.
 * Supports hard and soft policies.
 * - Hard policies: violations cause enforcement to throw.
 * - Soft policies: violations are reported as warnings but do not throw.
 */

import type { Policy, PolicyViolation } from './types';
import { PolicyViolationError } from './PolicyViolationError';

export interface PolicyEvaluationResult {
  passed: boolean;
  violations: PolicyViolation[];
  hardViolations: PolicyViolation[];
  softViolations: PolicyViolation[];
}


/**
 * The PolicyEngine is responsible for registering policies and evaluating
 * them against a given context.
 */
export class PolicyEngine<Context = unknown> {
  private readonly policies: Policy<Context>[] = [];

  constructor(initialPolicies: Policy<Context>[] = []) {
    for (const policy of initialPolicies) {
      this.add(policy);
    }
  }

  /**
   * Adds a policy to the engine.
   */
  add(policy: Policy<Context>): void {
    // Prevent duplicate policy names
    if (this.policies.some((p) => p.name === policy.name)) {
      throw new Error(`Policy "${policy.name}" is already registered in this engine.`);
    }
    this.policies.push(policy);
  }

  /**
   * Returns all registered policies.
   */
  getPolicies(): Policy<Context>[] {
    return [...this.policies];
  }

  /**
   * Evaluates all policies against the provided context.
   */
  evaluate(context: Context): PolicyEvaluationResult {
    const violations: PolicyViolation[] = [];

    for (const policy of this.policies) {
      const result = policy.check(context);

      if (result === true) {
        continue;
      }

      if (result === false) {
        violations.push({
          policyName: policy.name,
          severity: policy.severity,
          message: `Policy "${policy.name}" was violated.`,
        });
        continue;
      }

      if (Array.isArray(result)) {
        for (const v of result) {
          violations.push({
            policyName: policy.name,
            severity: policy.severity,
            message: v.message,
            details: v.details,
          });
        }
      } else {
        violations.push({
          policyName: policy.name,
          severity: policy.severity,
          message: result.message,
          details: result.details,
        });
      }
    }

    const hardViolations = violations.filter((v) => v.severity === 'hard');
    const softViolations = violations.filter((v) => v.severity === 'soft');

    return {
      passed: violations.length === 0,
      violations,
      hardViolations,
      softViolations,
    };
  }

  /**
   * Enforces all policies.
   *
   * - Soft violations are collected and can be observed (returned or logged).
   * - Hard violations cause an error to be thrown (by default).
   *
   * @returns Evaluation result (including any soft violations)
   * @throws Error if any hard policy is violated
   */
  enforce(context: Context): PolicyEvaluationResult {
    const result = this.evaluate(context);

    if (result.hardViolations.length > 0) {
      throw new PolicyViolationError(result.hardViolations);
    }

    return result;
  }

  /**
   * Clears all registered policies.
   */
  clear(): void {
    this.policies.length = 0;
  }
}
