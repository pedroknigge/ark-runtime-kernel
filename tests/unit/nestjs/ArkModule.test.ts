import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ArkModule, ARK_KERNEL, InjectArk } from '../../../src/nestjs/index';
import { createArkKernel } from '../../../src/index';
import type { ArkKernel } from '../../../src/index';

function providerOf(module: ReturnType<typeof ArkModule.forRoot>) {
  return (module.providers as Array<{ provide: unknown; useValue?: unknown }>)[0];
}

describe('ArkModule (NestJS adapter)', () => {
  it('forRoot() creates a strict kernel and exposes it globally under ARK_KERNEL', () => {
    const module = ArkModule.forRoot();
    expect(module.module).toBe(ArkModule);
    expect(module.global).toBe(true);
    expect(module.exports).toEqual([ARK_KERNEL]);

    const provider = providerOf(module);
    expect(provider.provide).toBe(ARK_KERNEL);
    const kernel = provider.useValue as ArkKernel;
    expect(typeof kernel.manifest).toBe('function');
    expect(kernel.registry).toBeDefined();
  });

  it('forRoot(kernel) reuses an existing kernel instance', () => {
    const kernel = createArkKernel();
    const module = ArkModule.forRoot(kernel);
    expect(providerOf(module).useValue).toBe(kernel);
  });

  it('forRoot(options) passes kernel options through', () => {
    const module = ArkModule.forRoot({ instanceId: 'test-instance' });
    const kernel = providerOf(module).useValue as ArkKernel;
    expect(kernel.instanceId).toBe('test-instance');
  });

  it('forRootAsync wires the factory and inject list', () => {
    const kernel = createArkKernel();
    const module = ArkModule.forRootAsync({
      useFactory: () => kernel,
      inject: ['SOME_DEP'],
    });
    const provider = (module.providers as Array<{
      provide: unknown;
      useFactory: () => unknown;
      inject: unknown[];
    }>)[0];
    expect(provider.provide).toBe(ARK_KERNEL);
    expect(provider.useFactory()).toBe(kernel);
    expect(provider.inject).toEqual(['SOME_DEP']);
  });

  it('InjectArk() returns a parameter decorator', () => {
    expect(typeof InjectArk()).toBe('function');
  });
});
