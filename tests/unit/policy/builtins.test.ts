import { describe, it, expect } from 'vitest';
import {
  defineLayerPolicy,
  architecturalPolicies,
  PolicyEngine,
} from '../../../src/index';

describe('built-in layer policies', () => {
  it('defineLayerPolicy detects forbidden layer crossings', () => {
    const policy = defineLayerPolicy({
      name: 'no-domain-to-adapter',
      severity: 'hard',
      rules: [{ from: 'Domain', to: 'Adapter', allowed: false }],
    });

    const engine = new PolicyEngine([policy]);
    const result = engine.evaluate({
      edges: [{ from: 'Domain.Order', to: 'Adapter.Db', kind: 'declared' }],
    });

    expect(result.passed).toBe(false);
    expect(result.hardViolations[0].message).toContain('Layer violation');
  });

  it('cleanArchitectureMatrix blocks Domain→Adapter and Domain→Application', () => {
    const engine = new PolicyEngine([architecturalPolicies.cleanArchitectureMatrix()]);
    const adapterResult = engine.evaluate({
      relationships: [{ from: 'Domain.X', to: 'Adapter.Y', kind: 'dependsOn' }],
    });
    const appResult = engine.evaluate({
      relationships: [{ from: 'Domain.X', to: 'Application.Y', kind: 'dependsOn' }],
    });

    expect(adapterResult.passed).toBe(false);
    expect(appResult.passed).toBe(false);
  });
});