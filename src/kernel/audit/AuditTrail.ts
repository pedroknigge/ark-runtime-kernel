import type {
  AuditQuery,
  AuditRecord,
  AuditRecordInput,
  AuditStore,
  AuditTrail,
  CreateAuditTrailOptions,
} from './types';

let auditSequence = 0;

function createAuditId(): string {
  auditSequence += 1;
  return `audit-${Date.now()}-${auditSequence}`;
}

function matchesQuery(record: AuditRecord, query: AuditQuery): boolean {
  if (query.type && record.type !== query.type) return false;
  if (query.intent && record.intent !== query.intent) return false;
  if (query.correlationId && record.correlationId !== query.correlationId) return false;
  if (query.subject && record.subject !== query.subject) return false;
  if (query.since && record.timestamp < query.since) return false;
  if (query.until && record.timestamp > query.until) return false;
  return true;
}

export class InMemoryAuditStore implements AuditStore {
  private readonly records: AuditRecord[] = [];

  constructor(private readonly maxRecords?: number) {}

  append(record: AuditRecord): void {
    this.records.push(record);
    if (this.maxRecords !== undefined && this.records.length > this.maxRecords) {
      this.records.splice(0, this.records.length - this.maxRecords);
    }
  }

  query(query: AuditQuery = {}): AuditRecord[] {
    const records = this.records.filter((record) => matchesQuery(record, query));
    return query.limit === undefined ? [...records] : records.slice(-query.limit);
  }

  clear(): void {
    this.records.length = 0;
  }
}

export class AuditTrailImpl implements AuditTrail {
  constructor(private readonly store: AuditStore) {}

  async record(input: AuditRecordInput): Promise<AuditRecord> {
    const record: AuditRecord = {
      id: createAuditId(),
      timestamp: input.timestamp ?? new Date().toISOString(),
      type: input.type,
      source: input.source,
      actor: input.actor,
      intent: input.intent,
      correlationId: input.correlationId,
      causationId: input.causationId,
      subject: input.subject,
      details: input.details,
    };
    await this.store.append(record);
    return record;
  }

  async query(query?: AuditQuery): Promise<AuditRecord[]> {
    return this.store.query(query);
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }
}

export function createAuditTrail(options: CreateAuditTrailOptions = {}): AuditTrail {
  return new AuditTrailImpl(
    options.store ?? new InMemoryAuditStore(options.maxRecords)
  );
}
