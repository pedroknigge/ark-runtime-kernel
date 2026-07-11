import type { AuditQuery, AuditRecord } from '../audit';
import type { DomainEvent } from '../../domain/types';
import type { ObservabilityDriftReport } from '../observability';
import type { OutboxRecord, OutboxStatus } from '../outbox';
import type { TraceRecord, TraceRecordType } from '../event-bus';

export interface StructrailTestSnapshot {
  events: DomainEvent[];
  traces: TraceRecord[];
  audit: AuditRecord[];
  outbox: OutboxRecord[];
  observability: ObservabilityDriftReport;
}

export interface StructrailTestHarness {
  events(intent?: string): DomainEvent[];
  traces(type?: TraceRecordType): TraceRecord[];
  audit(query?: AuditQuery): Promise<AuditRecord[]>;
  outbox(status?: OutboxStatus): Promise<OutboxRecord[]>;
  observability(): ObservabilityDriftReport;
  snapshot(): Promise<StructrailTestSnapshot>;
  clear(): Promise<void>;
}

/** @deprecated Use StructrailTestSnapshot. Removal target: v4. */
export type ArkTestSnapshot = StructrailTestSnapshot;
/** @deprecated Use StructrailTestHarness. Removal target: v4. */
export type ArkTestHarness = StructrailTestHarness;
