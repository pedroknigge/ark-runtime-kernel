/**
 * NestJS adapter for Structrail.
 *
 * ```ts
 * import { StructrailModule, InjectStructrail } from 'structrail/nestjs';
 * import type { StructrailKernel } from 'structrail/runtime';
 *
 * @Module({ imports: [StructrailModule.forRoot()] })
 * export class AppModule {}
 *
 * @Injectable()
 * export class PlaceOrderService {
 *   constructor(@InjectStructrail() private readonly structrail: StructrailKernel) {}
 * }
 * ```
 *
 * `@nestjs/common` is an optional peer dependency: this entry point is only
 * loaded when you import `structrail/nestjs`.
 */
import { Inject, Module } from '@nestjs/common';
import type {
  DynamicModule,
  InjectionToken,
  OptionalFactoryDependency,
} from '@nestjs/common';
import { createStructrailKernel } from '../kernel/runtime/createArkKernel';
import type { StructrailKernel } from '../kernel/runtime/types';
import type { CreateStructrailKernelOptions } from '../kernel/runtime/types';

/** Injection token for the Structrail kernel instance. */
export const STRUCTRAIL_KERNEL = Symbol('STRUCTRAIL_KERNEL');

/** @deprecated Use STRUCTRAIL_KERNEL. Removal target: v4. */
export const ARK_KERNEL = STRUCTRAIL_KERNEL;

/** Constructor-parameter decorator that injects the Structrail kernel. */
export const InjectStructrail = (): ParameterDecorator => Inject(STRUCTRAIL_KERNEL);

/** @deprecated Use InjectStructrail. Removal target: v4. */
export const InjectArk = InjectStructrail;

export interface StructrailModuleAsyncOptions {
  /** Factory that builds (or resolves) the kernel; supports Nest DI via `inject`. */
  useFactory: (...deps: never[]) => StructrailKernel | Promise<StructrailKernel>;
  inject?: Array<InjectionToken | OptionalFactoryDependency>;
}

/** @deprecated Use StructrailModuleAsyncOptions. Removal target: v4. */
export type ArkModuleAsyncOptions = StructrailModuleAsyncOptions;

@Module({})
export class StructrailModule {
  /**
   * Registers a global Structrail kernel. Pass an existing kernel to share one across
   * processes/tests, or options to create a fresh strict kernel.
   */
  static forRoot(
    kernelOrOptions?: StructrailKernel | CreateStructrailKernelOptions
  ): DynamicModule {
    const kernel =
      kernelOrOptions && 'registry' in kernelOrOptions
        ? kernelOrOptions
        : createStructrailKernel(kernelOrOptions);
    return {
      module: StructrailModule,
      global: true,
      providers: [{ provide: STRUCTRAIL_KERNEL, useValue: kernel }],
      exports: [STRUCTRAIL_KERNEL],
    };
  }

  static forRootAsync(options: StructrailModuleAsyncOptions): DynamicModule {
    return {
      module: StructrailModule,
      global: true,
      providers: [
        {
          provide: STRUCTRAIL_KERNEL,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ],
      exports: [STRUCTRAIL_KERNEL],
    };
  }
}

/** @deprecated Use StructrailModule. Removal target: v4. */
export const ArkModule = StructrailModule;
/** @deprecated Use StructrailModule. Removal target: v4. */
export type ArkModule = StructrailModule;
export type {
  StructrailKernel,
  CreateStructrailKernelOptions,
};
/** @deprecated Use StructrailKernel. Removal target: v4. */
export type ArkKernel = StructrailKernel;
/** @deprecated Use CreateStructrailKernelOptions. Removal target: v4. */
export type CreateArkKernelOptions = CreateStructrailKernelOptions;
