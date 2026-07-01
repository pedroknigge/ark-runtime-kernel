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
});
