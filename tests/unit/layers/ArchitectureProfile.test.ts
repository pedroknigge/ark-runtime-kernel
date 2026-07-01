import { describe, expect, it } from 'vitest';
import {
  PolicyEngine,
  defineArchitectureProfilePolicy,
  elevenLayerProfile,
} from '../../../src/index';

describe('Architecture profiles', () => {
  it('resolves the 11-layer profile from semantic names', () => {
    expect(elevenLayerProfile.resolveLayer('Domain.Order.Placed')).toBe('DomainModel');
    expect(elevenLayerProfile.resolveLayer('Adapter.Persistence.Sql')).toBe('PersistenceAdapters');
    expect(elevenLayerProfile.resolveLayer('Reporting.OrderSummary')).toBe('ReportingReadModels');
  });

  it('feeds profile rules into layer policy enforcement', () => {
    const engine = new PolicyEngine([
      defineArchitectureProfilePolicy(elevenLayerProfile),
    ]);

    const result = engine.evaluate({
      relationships: [
        {
          from: 'Domain.Order.Aggregate',
          to: 'Adapter.Persistence.OrderRepo',
          kind: 'dependsOn',
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.hardViolations[0].message).toContain('DomainModel');
  });
});
