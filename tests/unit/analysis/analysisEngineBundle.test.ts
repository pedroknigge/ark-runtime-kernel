import { describe, expect, it } from 'vitest';
import {
  analyzeChange as analyzeChangeFromKernel,
  analyzeProject as analyzeProjectFromKernel,
  loadContract as loadContractFromKernel,
} from '../../../src/index';
import {
  analyzeChange as analyzeChangeFromBundle,
  analyzeProject as analyzeProjectFromBundle,
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
});
