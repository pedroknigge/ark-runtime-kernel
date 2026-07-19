import { describe, expect, it } from 'vitest';
import { loadContract, resolvedFactsEvidenceRequirementsHash } from '../../../src/gate';
import { effectiveAnalysisConfig } from '../../../bin/lib/analysis-policy.mjs';

const config = {
  include: ['src'],
  layers: [
    { name: 'DomainModel', patterns: ['src/domain/**'], intentPrefixes: ['OldDomain.'] },
    { name: 'Kernel', patterns: ['src/kernel/**'], intentPrefixes: ['OldKernel.'] },
  ],
  rules: [],
};

describe('Z04 effective manifest policy identity', () => {
  it('folds retained manifest rules and prefixes into both policy identities', () => {
    const first = effectiveAnalysisConfig(config, {
      architecture: {
        layers: [
          { name: 'DomainModel', prefixes: ['Domain.'] },
          { name: 'Kernel', prefixes: ['Kernel.'] },
        ],
        rules: [{ from: 'DomainModel', to: 'Kernel', allowed: false }],
      },
    });
    const second = effectiveAnalysisConfig(config, {
      architecture: {
        layers: [
          { name: 'DomainModel', prefixes: ['Domain.Changed.'] },
          { name: 'Kernel', prefixes: ['Kernel.'] },
        ],
        rules: [{ from: 'DomainModel', to: 'Kernel', allowed: true }],
      },
    });

    expect(first.layers.map((layer) => layer.intentPrefixes)).toEqual([
      ['Domain.'],
      ['Kernel.'],
    ]);
    expect(first.rules).toEqual([
      { from: 'DomainModel', to: 'Kernel', allowed: false },
    ]);
    expect(loadContract(first).policyHash).not.toBe(loadContract(second).policyHash);
    expect(resolvedFactsEvidenceRequirementsHash(first)).not.toBe(
      resolvedFactsEvidenceRequirementsHash(second)
    );
  });
});
