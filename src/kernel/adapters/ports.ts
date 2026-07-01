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
    const missing = requiredKeys.filter((k) => !hasMember(impl, k));
    if (missing.length > 0) {
      throw new Error(
        `Adapter for port "${port.name}" is missing required members: ${missing.join(', ')}`
      );
    }
  }
  return { port, impl };
}

export function checkContract(
  impl: unknown,
  requiredKeys: string[] = []
): ContractCheckResult {
  const missing = requiredKeys.filter((k) => !hasMember(impl, k));
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

function hasMember(value: unknown, key: string): boolean {
  return (
    value != null &&
    (typeof value === 'object' || typeof value === 'function') &&
    key in value
  );
}
