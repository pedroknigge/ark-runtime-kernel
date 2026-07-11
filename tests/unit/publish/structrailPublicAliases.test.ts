import { describe, expect, it } from 'vitest';
import {
  createArchitectureProfileFromArkConfig,
  createArchitectureProfileFromStructrailConfig,
  createArkKernel,
  createArkKernelFromConfig,
  createArkManifest,
  createArkTestHarness,
  createElevenLayerArkConfig,
  createElevenLayerStructrailConfig,
  createStructrailKernel,
  createStructrailKernelFromConfig,
  createStructrailManifest,
  createStructrailTestHarness,
  type ArkCheckConfig,
  type ArkKernel,
  type ArkManifest,
  type ArkTestHarness,
  type StructrailCheckConfig,
  type StructrailKernel,
  type StructrailManifest,
  type StructrailTestHarness,
} from '../../../src/index';
import {
  ARK_KERNEL,
  ArkModule,
  InjectArk,
  InjectStructrail,
  STRUCTRAIL_KERNEL,
  StructrailModule,
} from '../../../src/nestjs/index';
import {
  loadArkConfig,
  loadStructrailConfig,
} from '../../../src/eslint/index';

describe('Structrail public API aliases', () => {
  it('makes Structrail values primary aliases of the v3 Ark compatibility surface', () => {
    expect(createStructrailKernel).toBe(createArkKernel);
    expect(createStructrailKernelFromConfig).toBe(createArkKernelFromConfig);
    expect(createStructrailManifest).toBe(createArkManifest);
    expect(createStructrailTestHarness).toBe(createArkTestHarness);
    expect(createArchitectureProfileFromStructrailConfig).toBe(
      createArchitectureProfileFromArkConfig
    );
    expect(createElevenLayerStructrailConfig).toBe(createElevenLayerArkConfig);
    expect(loadStructrailConfig).toBe(loadArkConfig);
    expect(StructrailModule).toBe(ArkModule);
    expect(InjectStructrail).toBe(InjectArk);
    expect(STRUCTRAIL_KERNEL).toBe(ARK_KERNEL);
  });

  it('exposes canonical type names with assignable v3 compatibility aliases', () => {
    const config: StructrailCheckConfig = { include: ['src'], layers: [] };
    const legacyConfig: ArkCheckConfig = config;
    const kernel: StructrailKernel = createStructrailKernel({ instanceId: 'structrail-test' });
    const legacyKernel: ArkKernel = kernel;
    const manifest: StructrailManifest = createStructrailManifest();
    const legacyManifest: ArkManifest = manifest;
    const harness: StructrailTestHarness = createStructrailTestHarness(kernel);
    const legacyHarness: ArkTestHarness = harness;

    expect(legacyConfig).toBe(config);
    expect(legacyKernel).toBe(kernel);
    expect(legacyManifest).toBe(manifest);
    expect(legacyHarness).toBe(harness);
  });
});
