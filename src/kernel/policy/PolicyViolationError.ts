/**
 * Typed error thrown when hard policies are violated.
 */

import type { PolicyViolation } from './types';

export class PolicyViolationError extends Error {
  readonly violations: PolicyViolation[];

  constructor(violations: PolicyViolation[]) {
    const messages = violations
      .map((v) => `- ${v.policyName}: ${v.message}`)
      .join('\n');
    super(`Hard policy violation(s) detected:\n${messages}`);
    this.name = 'PolicyViolationError';
    this.violations = violations;
  }
}