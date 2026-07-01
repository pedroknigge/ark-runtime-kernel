/**
 * Ports & Adapters basic contracts.
 */

export interface Port<T = unknown> {
  readonly name: string;
  readonly __port?: T; // phantom for typing
}

export interface Adapter<T = unknown> {
  readonly port: Port<T>;
  readonly impl: T;
}

/**
 * Simple contract checker (duck typing + optional required keys).
 */
export type ContractCheckResult = { ok: true } | { ok: false; missing: string[] };
