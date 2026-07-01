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
    expect(reg.toJSON()).toEqual([order]);
  });

  it('keeps entity to intent links available for manifests and agents', () => {
    const reg = createMetadataRegistry();
    const order = reg.entity('Order', {
      fields: { id: { type: 'string', identity: true } },
      emits: ['Domain.Order.Placed'],
      consumes: ['Application.PlaceOrder'],
    });

    expect(reg.toJSON()[0]).toEqual(order);
    expect(reg.toJSON()[0].emits).toContain('Domain.Order.Placed');
  });

  it('validates relations and rejects duplicate entity registration by default', () => {
    const reg = createMetadataRegistry();
    reg.entity('Order', {
      version: '1.0.0',
      owner: 'Orders',
      layer: 'DomainModel',
      fields: {
        id: { type: 'string', identity: true },
        customerId: { type: 'string', relation: { entity: 'Customer' } },
      },
    });

    expect(() => {
      reg.entity('Order', { fields: {} });
    }).toThrow(/already registered/);

    const validation = reg.validate();
    expect(validation.ok).toBe(false);
    expect(validation.issues[0].message).toContain('Customer');
  });
});
