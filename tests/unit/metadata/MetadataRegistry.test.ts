import { describe, it, expect } from 'vitest';
import { createMetadataRegistry } from '../../../src/index';

describe('Metadata System (basic)', () => {
  it('registers and retrieves entity metadata', () => {
    const reg = createMetadataRegistry();
    const order = reg.entity('Order', {
      fields: {
        id: { type: 'string', identity: true },
        status: { type: 'string', required: true },
      },
      rules: [{ name: 'status-valid' }],
    });

    expect(reg.getEntity('Order')).toEqual(order);
    expect(reg.listEntities().length).toBe(1);
  });
});
