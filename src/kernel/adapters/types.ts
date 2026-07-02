import type { IntentName } from '../../domain/types';

/**
 * Ports & Adapters basic contracts.
 */

export interface Port<T = unknown> {
  readonly name: string;
  readonly ownerLayer?: string;
  readonly intent?: IntentName;
  readonly allowedAdapters?: string[];
  readonly __port?: T; // phantom for typing
}

export interface Adapter<T = unknown> {
  readonly name?: string;
  readonly layer?: string;
  readonly intent?: IntentName;
  readonly port: Port<T>;
  readonly impl: T;
}

export interface DefinePortOptions {
  ownerLayer?: string;
  intent?: IntentName;
  allowedAdapters?: string[];
}

export interface CreateAdapterOptions {
  name?: string;
  layer?: string;
  intent?: IntentName;
  requiredKeys?: string[];
}

/**
 * Simple contract checker (duck typing + optional required keys).
 */
export type ContractCheckResult = { ok: true } | { ok: false; missing: string[] };

export interface AdapterGovernanceIssue {
  ruleId: 'ADAPTER_NOT_ALLOWED_FOR_PORT';
  message: string;
  port: string;
  adapter?: string;
}

export type AdapterGovernanceResult =
  | { ok: true; issues: [] }
  | { ok: false; issues: AdapterGovernanceIssue[] };
