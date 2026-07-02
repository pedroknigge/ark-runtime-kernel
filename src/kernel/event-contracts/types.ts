import type { DomainEvent, IntentName } from '../../domain/types';

export type EventSchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'unknown';

export interface EventSchemaField {
  type: EventSchemaFieldType;
  required?: boolean;
  description?: string;
  /** Allowed literal values for this field. Compared with Object.is. */
  enum?: unknown[];
  /** Nested object fields when type is "object". */
  fields?: EventPayloadSchema;
  /** Array item schema when type is "array". */
  items?: EventSchemaField;
}

export type EventPayloadSchema = Record<string, EventSchemaField>;

export interface EventContract {
  intent: IntentName;
  version: string;
  schema?: EventPayloadSchema;
  owner?: string;
  rationale?: string;
  deprecated?: boolean | string;
  allowAdditionalFields?: boolean;
}

export interface EventContractIssue {
  intent: string;
  version?: string;
  field?: string;
  message: string;
}

export interface EventContractValidationResult {
  ok: boolean;
  contract?: EventContract;
  issues: EventContractIssue[];
}

export interface EventContractRegistry {
  register(contract: EventContract): void;
  get(intent: string, version?: string): EventContract | undefined;
  list(intent?: string): EventContract[];
  validate(event: DomainEvent): EventContractValidationResult;
  clear(): void;
}
