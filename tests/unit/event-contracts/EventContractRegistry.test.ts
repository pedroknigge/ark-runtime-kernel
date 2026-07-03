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

describe('EventContractRegistry — Standard Schema', () => {
  function fakeStandardSchema(
    validate: (value: unknown) => { value: unknown } | { issues: Array<{ message: string; path?: Array<PropertyKey | { key: PropertyKey }> }> } | Promise<never>
  ) {
    return { '~standard': { version: 1 as const, vendor: 'test', validate } };
  }

  it('accepts a passing Standard Schema validator', () => {
    defaultIntentRegistry.clear();
    const Placed = defineIntent<'Domain.Order.StdOk', { id: string }>('Domain.Order.StdOk');
    const contracts = createEventContractRegistry();
    contracts.register({
      intent: 'Domain.Order.StdOk',
      version: '1',
      standardSchema: fakeStandardSchema((value) => ({ value })),
    });

    expect(contracts.validate(Placed({ id: 'o1' })).ok).toBe(true);
  });

  it('maps Standard Schema issues (with paths) to contract issues', () => {
    defaultIntentRegistry.clear();
    const Placed = defineIntent<'Domain.Order.StdBad', { id: string }>('Domain.Order.StdBad');
    const contracts = createEventContractRegistry();
    contracts.register({
      intent: 'Domain.Order.StdBad',
      version: '1',
      standardSchema: fakeStandardSchema(() => ({
        issues: [
          { message: 'Expected string', path: ['id'] },
          { message: 'Unknown key', path: [{ key: 'extra' }] },
        ],
      })),
    });

    const result = contracts.validate(Placed({ id: 'o1' }));
    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(2);
    expect(result.issues[0].field).toBe('id');
    expect(result.issues[0].message).toBe('Expected string');
    expect(result.issues[1].field).toBe('extra');
  });

  it('rejects async Standard Schema validators with a clear issue', () => {
    defaultIntentRegistry.clear();
    const Placed = defineIntent<'Domain.Order.StdAsync', { id: string }>('Domain.Order.StdAsync');
    const contracts = createEventContractRegistry();
    contracts.register({
      intent: 'Domain.Order.StdAsync',
      version: '1',
      standardSchema: fakeStandardSchema(() => new Promise<never>(() => {})),
    });

    const result = contracts.validate(Placed({ id: 'o1' }));
    expect(result.ok).toBe(false);
    expect(result.issues[0].message).toContain('synchronous');
  });

  it('runs both the built-in schema and the Standard Schema validator', () => {
    defaultIntentRegistry.clear();
    const Placed = defineIntent<'Domain.Order.StdBoth', { id: string }>('Domain.Order.StdBoth');
    const contracts = createEventContractRegistry();
    contracts.register({
      intent: 'Domain.Order.StdBoth',
      version: '1',
      schema: { id: { type: 'number', required: true } },
      standardSchema: fakeStandardSchema(() => ({ issues: [{ message: 'std says no' }] })),
    });

    const result = contracts.validate(Placed({ id: 'o1' }));
    expect(result.ok).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });
});
