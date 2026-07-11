import { describe, expect, it } from 'vitest';
import {
  analyzeChange as analyzeChangeFromKernel,
  analyzeProject as analyzeProjectFromKernel,
  collectAnalysisConfigWarnings as collectWarningsFromKernel,
  evaluateArchitectureGraph as evaluateGraphFromKernel,
  loadContract as loadContractFromKernel,
} from '../../../src/index';
import {
  analyzeChange as analyzeChangeFromBundle,
  analyzeProject as analyzeProjectFromBundle,
  collectAnalysisConfigWarnings as collectWarningsFromBundle,
  evaluateArchitectureGraph as evaluateGraphFromBundle,
  loadContract as loadContractFromBundle,
} from '../../../bin/lib/analysis-engine.mjs';

const config = {
  include: ['src'],
  layers: [
    { name: 'DomainModel', patterns: ['src/domain/**'] },
    { name: 'Kernel', patterns: ['src/kernel/**'] },
  ],
  rules: [{ from: 'DomainModel', to: 'Kernel', allowed: false }],
};

const files = [
  {
    path: 'src/domain/order.ts',
    content: "import { service } from '../kernel/service';\nexport const order = service;\n",
  },
  { path: 'src/kernel/service.ts', content: 'export const service = 1;\n' },
];

describe('generated CLI analysis engine', () => {
  it('matches the canonical Kernel API for project analysis', () => {
    const kernelContract = loadContractFromKernel(config);
    const bundleContract = loadContractFromBundle(config);

    expect(bundleContract).toEqual(kernelContract);
    expect(
      analyzeProjectFromBundle({ contract: bundleContract, files, compilerOptions: { strict: true } })
    ).toEqual(
      analyzeProjectFromKernel({ contract: kernelContract, files, compilerOptions: { strict: true } })
    );
  });

  it('matches the canonical Kernel API for in-memory changes', () => {
    const kernelContract = loadContractFromKernel(config);
    const bundleContract = loadContractFromBundle(config);
    const changes = [
      { path: 'src/domain/order.ts', content: 'export const order = 2;\n' },
    ] as const;

    expect(analyzeChangeFromBundle({ contract: bundleContract, files, changes })).toEqual(
      analyzeChangeFromKernel({ contract: kernelContract, files, changes })
    );
  });

  it.each(['strict', 'soft', 'off'] as const)(
    'matches graph policy and cycle evaluation for cyclePolicy=%s',
    (cyclePolicy) => {
      const contract = loadContractFromKernel({ ...config, cyclePolicy });
      const input = {
        config: contract.config,
        rules: contract.config.rules,
        files: ['src/domain/a.ts', 'src/kernel/b.ts'],
        contentViolations: [],
        edges: [
          {
            from: 'src/domain/a.ts',
            fromLayer: 'DomainModel',
            to: 'src/kernel/b.ts',
            toLayer: 'Kernel',
            line: 3,
            kind: 'import',
            portProofEligible: true,
          },
          {
            from: 'src/kernel/b.ts',
            fromLayer: 'Kernel',
            to: 'src/domain/a.ts',
            toLayer: 'DomainModel',
            line: 1,
            kind: 'import',
          },
        ],
      };

      expect(evaluateGraphFromBundle(input)).toEqual(evaluateGraphFromKernel(input));
      const result = evaluateGraphFromKernel(input);
      expect(result.violations.some(({ ruleId }) => ruleId === 'LAYER_IMPORT_VIOLATION')).toBe(true);
      expect(result.violations.some(({ ruleId }) => ruleId === 'CIRCULAR_DEPENDENCY')).toBe(
        cyclePolicy === 'strict'
      );
      expect(result.warnings.some(({ ruleId }) => ruleId === 'CIRCULAR_DEPENDENCY')).toBe(
        cyclePolicy === 'soft'
      );
    }
  );

  it('matches canonical configuration diagnostics', () => {
    const contract = loadContractFromKernel({
      include: ['src'],
      layers: [
        { name: 'One', patterns: ['src/**'] },
        { name: 'Two', patterns: ['src/**'] },
        { name: 'Missing', patterns: ['missing/**'] },
      ],
      rules: [{ from: 'Unknown', to: 'Two', allowed: false }],
    });
    const input = {
      config: contract.config,
      rules: contract.config.rules,
      files: ['src/a.ts', 'other/unclassified.ts'],
    };

    const kernelWarnings = collectWarningsFromKernel(input);
    expect(collectWarningsFromBundle(input)).toEqual(kernelWarnings);
    expect(kernelWarnings.map(({ ruleId }) => ruleId)).toEqual(
      expect.arrayContaining([
        'CONFIG_LAYER_PATTERN_NO_MATCHES',
        'CONFIG_RULE_UNKNOWN_FROM_LAYER',
        'CONFIG_AMBIGUOUS_LAYERS',
        'CONFIG_UNCLASSIFIED_FILES',
      ])
    );
  });
});
