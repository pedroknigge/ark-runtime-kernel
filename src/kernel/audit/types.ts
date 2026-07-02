export type MaybePromise<T> = T | Promise<T>;

export type AuditRecordType =
  | 'event.published'
  | 'event.rawPublish'
  | 'event.intercepted'
  | 'interceptor.error'
  | 'policy.softViolation'
  | 'policy.hardViolation'
  | 'layer.observedViolation'
  | 'handler.error'
  | 'hook.error'
  | 'workflow.started'
  | 'workflow.step.completed'
  | 'workflow.step.failed'
  | 'workflow.compensation.completed'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'projection.applied'
  | 'metadata.changed';

export interface AuditRecord {
  id: string;
  type: AuditRecordType;
  timestamp: string;
  source?: string;
  actor?: string;
  intent?: string;
  correlationId?: string;
  causationId?: string;
  subject?: string;
  details?: unknown;
}

export interface AuditRecordInput {
  type: AuditRecordType;
  timestamp?: string;
  source?: string;
  actor?: string;
  intent?: string;
  correlationId?: string;
  causationId?: string;
  subject?: string;
  details?: unknown;
}

export interface AuditQuery {
  type?: AuditRecordType;
  intent?: string;
  correlationId?: string;
  subject?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export interface AuditStore {
  append(record: AuditRecord): MaybePromise<void>;
  query(query?: AuditQuery): MaybePromise<AuditRecord[]>;
  clear(): MaybePromise<void>;
}

export interface AuditTrail {
  record(input: AuditRecordInput): Promise<AuditRecord>;
  query(query?: AuditQuery): Promise<AuditRecord[]>;
  clear(): Promise<void>;
}

export interface CreateAuditTrailOptions {
  store?: AuditStore;
  maxRecords?: number;
}
