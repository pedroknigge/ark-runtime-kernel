import { describe, expect, it } from 'vitest';
import { InMemoryOutboxStore, defineIntent, defaultIntentRegistry } from '../../../src/index';

describe('InMemoryOutboxStore', () => {
  it('enqueues and marks event delivery state', async () => {
    defaultIntentRegistry.clear();
    const Event = defineIntent<'Domain.Test.Outbox', { id: string }>('Domain.Test.Outbox');
    const outbox = new InMemoryOutboxStore();

    const record = await outbox.enqueue(Event({ id: '1' }));
    expect(await outbox.list('pending')).toHaveLength(1);

    await outbox.markDispatched(record.id);
    expect(await outbox.list('pending')).toHaveLength(0);
    expect(await outbox.list('dispatched')).toHaveLength(1);
  });
});
