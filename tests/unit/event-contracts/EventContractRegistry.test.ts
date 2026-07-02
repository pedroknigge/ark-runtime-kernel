import { describe, expect, it } from 'vitest';
import {
  createEventContractRegistry,
  defineIntent,
  defaultIntentRegistry,
} from '../../../src/index';

describe('EventContractRegistry', () => {
  it('validates payload shape and versions', () => {
    defaultIntentRegistry.clear();
    const OrderPlaced = defineIntent<'Domain.Order.Placed', { id: string; amount: number }>(
      'Domain.Order.Placed'
    );
    const contracts = createEventContractRegistry();
    contracts.register({
      intent: 'Domain.Order.Placed',
      version: '1',
      allowAdditionalFields: false,
      schema: {
        id: { type: 'string', required: true },
        amount: { type: 'number', required: true },
      },
    });

    const valid = contracts.validate(
      OrderPlaced({ id: 'o1', amount: 10 })
    );
    const invalid = contracts.validate(
      OrderPlaced({ id: 'o1', amount: 'bad' as unknown as number })
    );

    expect(valid.ok).toBe(true);
    expect(invalid.ok).toBe(false);
    expect(invalid.issues[0].field).toBe('amount');
  });

  it('validates nested objects, typed arrays, and enum values', () => {
    defaultIntentRegistry.clear();
    const OrderShipped = defineIntent<
      'Domain.Order.Shipped',
      {
        id: string;
        status: string;
        address: { city?: string };
        lineIds: unknown[];
      }
    >('Domain.Order.Shipped');
    const contracts = createEventContractRegistry();
    contracts.register({
      intent: 'Domain.Order.Shipped',
      version: '1',
      schema: {
        id: { type: 'string', required: true },
        status: { type: 'string', enum: ['created', 'shipped'] },
        address: {
          type: 'object',
          required: true,
          fields: {
            city: { type: 'string', required: true },
          },
        },
        lineIds: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    });

    const valid = contracts.validate(
      OrderShipped({
        id: 'o1',
        status: 'shipped',
        address: { city: 'BA' },
        lineIds: ['l1', 'l2'],
      })
    );
    const invalid = contracts.validate(
      OrderShipped({
        id: 'o1',
        status: 'cancelled',
        address: {},
        lineIds: ['l1', 2],
      })
    );

    expect(valid.ok).toBe(true);
    expect(invalid.ok).toBe(false);
    expect(invalid.issues.map((issue) => issue.field)).toEqual([
      'status',
      'address.city',
      'lineIds[1]',
    ]);
  });
});
