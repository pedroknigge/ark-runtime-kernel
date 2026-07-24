import { describe, expect, it } from 'vitest';
import {
  buildEffectiveArkRules,
  emptyEffectiveArkRules,
  loadArkRulesContract,
} from '../../../src/domain/arkRulesContract';
import { classifyArkPolicyDelta } from '../../../src/domain/policyDelta';
import { loadContract, analyzePolicyDelta } from '../../../src/kernel/analysisCore';

const BASE_CONFIG = {
  schemaVersion: '1.1' as const,
  include: ['src'],
  layers: [{ name: 'DomainModel', patterns: ['src/domain/**'] }],
  rules: [],
};

function rulesFile(mode: 'advisory' | 'enforced' = 'advisory') {
  return loadArkRulesContract({
    schemaVersion: '1.0',
    layer: 'DomainModel',
    structure: [
      {
        id: 'always-valid-aggregates',
        sensor: 'aggregate-private-state',
        mode,
      },
    ],
  }).config;
}

describe('AR02 ArkRules policyHash + policy-delta', () => {
  it('keeps policyHash stable when arkRules is absent', () => {
    const a = loadContract(BASE_CONFIG);
    const b = loadContract({ ...BASE_CONFIG }, 'x.json', {
      arkRules: emptyEffectiveArkRules(),
    });
    expect(a.policyHash).toBe(b.policyHash);
  });

  it('invalidates policyHash when effective ArkRules content changes', () => {
    const advisory = buildEffectiveArkRules([
      {
        layer: 'DomainModel',
        sourceFile: 'arkrules/DomainModel.json',
        file: rulesFile('advisory'),
      },
    ]);
    const enforced = buildEffectiveArkRules([
      {
        layer: 'DomainModel',
        sourceFile: 'arkrules/DomainModel.json',
        file: rulesFile('enforced'),
      },
    ]);
    const withRefs = {
      ...BASE_CONFIG,
      arkRules: { DomainModel: 'arkrules/DomainModel.json' },
    };
    const hashA = loadContract(withRefs, 'a.json', { arkRules: advisory }).policyHash;
    const hashB = loadContract(withRefs, 'b.json', { arkRules: enforced }).policyHash;
    expect(hashA).not.toBe(hashB);
  });

  it('classifies add / promote / demote / delete of structure rules', () => {
    const baseCfg = { ...BASE_CONFIG };
    const candidateCfg = {
      ...BASE_CONFIG,
      arkRules: { DomainModel: 'arkrules/DomainModel.json' },
    };
    const added = classifyArkPolicyDelta(baseCfg as never, candidateCfg as never, {
      baseArkRules: emptyEffectiveArkRules(),
      candidateArkRules: buildEffectiveArkRules([
        {
          layer: 'DomainModel',
          sourceFile: 'arkrules/DomainModel.json',
          file: rulesFile('advisory'),
        },
      ]),
    });
    expect(added.classification).toBe('strengthening');
    expect(added.findings.some((f) => f.kind === 'arkrules-ref-added' || f.id.includes('arkrules'))).toBe(
      true
    );

    const promoted = classifyArkPolicyDelta(candidateCfg as never, candidateCfg as never, {
      baseArkRules: buildEffectiveArkRules([
        {
          layer: 'DomainModel',
          sourceFile: 'arkrules/DomainModel.json',
          file: rulesFile('advisory'),
        },
      ]),
      candidateArkRules: buildEffectiveArkRules([
        {
          layer: 'DomainModel',
          sourceFile: 'arkrules/DomainModel.json',
          file: rulesFile('enforced'),
        },
      ]),
    });
    expect(promoted.classification).toBe('strengthening');
    expect(promoted.findings.some((f) => f.id.includes('arkrule-promoted'))).toBe(true);

    const demoted = classifyArkPolicyDelta(candidateCfg as never, candidateCfg as never, {
      baseArkRules: buildEffectiveArkRules([
        {
          layer: 'DomainModel',
          sourceFile: 'arkrules/DomainModel.json',
          file: rulesFile('enforced'),
        },
      ]),
      candidateArkRules: buildEffectiveArkRules([
        {
          layer: 'DomainModel',
          sourceFile: 'arkrules/DomainModel.json',
          file: rulesFile('advisory'),
        },
      ]),
    });
    expect(demoted.classification).toBe('weakening');

    const removed = classifyArkPolicyDelta(candidateCfg as never, baseCfg as never, {
      baseArkRules: buildEffectiveArkRules([
        {
          layer: 'DomainModel',
          sourceFile: 'arkrules/DomainModel.json',
          file: rulesFile('advisory'),
        },
      ]),
      candidateArkRules: emptyEffectiveArkRules(),
    });
    expect(removed.classification).toBe('weakening');
  });

  it('analyzePolicyDelta requires acknowledgement for arkrule demotion', () => {
    const base = {
      ...BASE_CONFIG,
      arkRules: { DomainModel: 'arkrules/DomainModel.json' },
    };
    const candidate = {
      ...BASE_CONFIG,
      arkRules: { DomainModel: 'arkrules/DomainModel.json' },
    };
    const result = analyzePolicyDelta({
      baseConfig: base,
      candidateConfig: candidate,
      baseArkRules: buildEffectiveArkRules([
        {
          layer: 'DomainModel',
          sourceFile: 'arkrules/DomainModel.json',
          file: rulesFile('enforced'),
        },
      ]),
      candidateArkRules: buildEffectiveArkRules([
        {
          layer: 'DomainModel',
          sourceFile: 'arkrules/DomainModel.json',
          file: rulesFile('advisory'),
        },
      ]),
    });
    expect(result.requiresAcknowledgement).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.basePolicyHash).not.toBe(result.candidatePolicyHash);
  });
});
