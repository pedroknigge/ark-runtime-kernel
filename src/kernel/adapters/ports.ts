/**
 * Ports and Adapters utilities.
 *
 * definePort + createAdapter with basic runtime contract validation.
 */

import type {
  Adapter,
  AdapterGovernanceResult,
  ContractCheckResult,
  CreateAdapterOptions,
  DefinePortOptions,
  Port,
} from './types';

export function definePort<T = unknown>(
  name: string,
  options: DefinePortOptions = {}
): Port<T> {
  return {
    name,
    ownerLayer: options.ownerLayer,
    intent: options.intent,
    allowedAdapters: options.allowedAdapters
      ? [...options.allowedAdapters]
      : undefined,
  } as Port<T>;
}

export function createAdapter<T>(
  port: Port<T>,
  impl: T,
  requiredKeysOrOptions?: string[] | CreateAdapterOptions,
  adapterOptions: CreateAdapterOptions = {}
): Adapter<T> {
  const options = Array.isArray(requiredKeysOrOptions)
    ? { ...adapterOptions, requiredKeys: requiredKeysOrOptions }
    : { ...(requiredKeysOrOptions ?? {}) };
  const requiredKeys = options.requiredKeys;

  if (requiredKeys && requiredKeys.length > 0) {
    const missing = requiredKeys.filter((k) => !hasMember(impl, k));
    if (missing.length > 0) {
      throw new Error(
        `Adapter for port "${port.name}" is missing required members: ${missing.join(', ')}`
      );
    }
  }

  const adapter: Adapter<T> = {
    name: options.name,
    layer: options.layer,
    intent: options.intent,
    port,
    impl,
  };
  const governance = checkAdapterGovernance(adapter);
  if (!governance.ok) {
    throw new Error(governance.issues.map((issue) => issue.message).join('\n'));
  }
  return adapter;
}

export function checkContract(
  impl: unknown,
  requiredKeys: string[] = []
): ContractCheckResult {
  const missing = requiredKeys.filter((k) => !hasMember(impl, k));
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

export function checkAdapterGovernance(adapter: Adapter): AdapterGovernanceResult {
  const allowed = adapter.port.allowedAdapters ?? [];
  if (allowed.length === 0) {
    return { ok: true, issues: [] };
  }

  const adapterNames = [adapter.name, adapter.intent].filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  );
  const matched = adapterNames.some((name) => allowed.includes(name));
  if (matched) {
    return { ok: true, issues: [] };
  }

  return {
    ok: false,
    issues: [
      {
        ruleId: 'ADAPTER_NOT_ALLOWED_FOR_PORT',
        port: adapter.port.name,
        adapter: adapter.name ?? adapter.intent,
        message:
          `Adapter "${adapter.name ?? adapter.intent ?? 'unknown'}" is not allowed for port "${adapter.port.name}".`,
      },
    ],
  };
}

function hasMember(value: unknown, key: string): boolean {
  return (
    value != null &&
    (typeof value === 'object' || typeof value === 'function') &&
    key in value
  );
}
