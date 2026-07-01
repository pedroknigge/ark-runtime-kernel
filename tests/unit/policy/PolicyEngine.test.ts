import { describe, it, expect } from 'vitest';
import { definePolicy, PolicyEngine, PolicyViolationError } from '../../../src/index';

describe('PolicyEngine (Iteration 2)', () => {
  it('evaluates passing policies', () => {
    const engine = new PolicyEngine();
    engine.add(
      definePolicy({ name: 'Always pass', severity: 'hard', check: () => true })
    );

    const result = engine.evaluate({});

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects violations correctly', () => {
    const engine = new PolicyEngine();
    engine.add(
      definePolicy({ name: 'Fails', severity: 'soft', check: () => false })
    );
    engine.add(
      definePolicy({
        name: 'Hard fail',
        severity: 'hard',
        check: () => ({ message: 'Hard rule broken' }),
      })
    );

    const result = engine.evaluate({});

    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.softViolations).toHaveLength(1);
    expect(result.hardViolations).toHaveLength(1);
  });

  it('enforce() throws PolicyViolationError on hard violations', () => {
    const engine = new PolicyEngine();
    engine.add(
      definePolicy({
        name: 'Must not do X',
        severity: 'hard',
        check: () => false,
      })
    );

    try {
      engine.enforce({});
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PolicyViolationError);
      expect((err as PolicyViolationError).violations).toHaveLength(1);
    }
  });

  it('enforce() does not throw on soft violations only', () => {
    const engine = new PolicyEngine();
    engine.add(
      definePolicy({ name: 'Warning only', severity: 'soft', check: () => false })
    );

    expect(() => engine.enforce({})).not.toThrow();
    const result = engine.enforce({});
    expect(result.softViolations).toHaveLength(1);
  });

  it('prevents duplicate policy names', () => {
    const engine = new PolicyEngine();
    engine.add(definePolicy({ name: 'Unique', check: () => true }));

    expect(() => {
      engine.add(definePolicy({ name: 'Unique', check: () => true }));
    }).toThrow(/already registered/);
  });

  it('supports initial policies in constructor', () => {
    const policy = definePolicy({ name: 'Init policy', check: () => true });
    const engine = new PolicyEngine([policy]);

    expect(engine.getPolicies()).toHaveLength(1);
  });

  it('can be cleared', () => {
    const engine = new PolicyEngine();
    engine.add(definePolicy({ name: 'Temp', check: () => true }));
    engine.clear();

    expect(engine.getPolicies()).toHaveLength(0);
  });
});
