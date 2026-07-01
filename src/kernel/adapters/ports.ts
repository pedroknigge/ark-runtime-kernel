/**
 * Ports and Adapters utilities.
 *
 * definePort + createAdapter with basic runtime contract validation.
 */

import type { Adapter, ContractCheckResult, Port } from './types';

export function definePort<T = unknown>(name: string): Port<T> {
  return { name } as Port<T>;
}

export function createAdapter<T>(
  port: Port<T>,
  impl: T,
  requiredKeys?: string[]
): Adapter<T> {
  if (requiredKeys && requiredKeys.length > 0) {
    const missing = requiredKeys.filter(
      (k) => !(impl as any) || typeof (impl as any)[k] === 'undefined'
    );
    if (missing.length > 0) {
      throw new Error(
        `Adapter for port "${port.name}" is missing required members: ${missing.join(', ')}`
      );
    }
  }
  return { port, impl };
}

export function checkContract(
  impl: any,
  requiredKeys: string[] = []
): ContractCheckResult {
  const missing = requiredKeys.filter(
    (k) => impl == null || typeof impl[k] === 'undefined'
  );
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
