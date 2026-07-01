import { describe, it, expect } from 'vitest';
import { definePolicy } from '../../../src/index';
import type { PolicyViolation } from '../../../src/index';

describe('definePolicy (Iteration 2)', () => {
  it('creates a policy with defaults', () => {
    const policy = definePolicy({
      name: 'Test policy',
      check: () => true,
    });

    expect(policy.name).toBe('Test policy');
    expect(policy.severity).toBe('soft');
  });

  it('respects explicit severity', () => {
    const hardPolicy = definePolicy({
      name: 'Hard rule',
      severity: 'hard',
      check: () => true,
    });

    expect(hardPolicy.severity).toBe('hard');
  });

  it('check can return boolean', () => {
    const alwaysPass = definePolicy({ name: 'Always pass', check: () => true });
    const alwaysFail = definePolicy({ name: 'Always fail', check: () => false });

    expect(alwaysPass.check({})).toBe(true);
    expect(alwaysFail.check({})).toBe(false);
  });

  it('check can return a violation object (partial)', () => {
    const policy = definePolicy({
      name: 'Violation policy',
      severity: 'hard',
      check: () => ({
        message: 'Something went wrong',
        details: { foo: 'bar' },
      }),
    });

    // The raw check result is what the user returned.
    // The PolicyEngine enriches it with name + severity during evaluation.
    const result = policy.check({}) as { message: string; details: unknown };
    expect(result.message).toBe('Something went wrong');
    expect(result.details).toEqual({ foo: 'bar' });
  });

  it('check can return an array of violations', () => {
    const policy = definePolicy({
      name: 'Multi violation',
      check: () => [
        { message: 'First issue' },
        { message: 'Second issue' },
      ],
    });

    const result = policy.check({}) as PolicyViolation[];
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
  });
});
