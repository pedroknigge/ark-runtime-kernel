import { describe, expect, it } from 'vitest';
import { createAuditTrail } from '../../../src/index';

describe('AuditTrail', () => {
  it('records and queries bounded native audit history', async () => {
    const audit = createAuditTrail({ maxRecords: 2 });

    await audit.record({ type: 'event.published', intent: 'Domain.A' });
    await audit.record({ type: 'handler.error', intent: 'Domain.B' });
    await audit.record({ type: 'event.published', intent: 'Domain.C' });

    expect(await audit.query()).toHaveLength(2);
    expect(await audit.query({ type: 'event.published' })).toHaveLength(1);
    expect((await audit.query({ type: 'event.published' }))[0].intent).toBe('Domain.C');
  });
});
