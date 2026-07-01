import type { DomainEvent } from '../../domain/types';

export type OutboxStatus = 'pending' | 'dispatched' | 'failed';

export interface OutboxRecord {
  id: string;
  event: DomainEvent;
  status: OutboxStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface OutboxStore {
  enqueue(event: DomainEvent): Promise<OutboxRecord>;
  markDispatched(id: string): Promise<void>;
  markFailed(id: string, error: unknown): Promise<void>;
  list(status?: OutboxStatus): Promise<OutboxRecord[]>;
  clear(): Promise<void>;
}
