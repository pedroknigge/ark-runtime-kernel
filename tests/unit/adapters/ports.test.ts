import { describe, it, expect } from 'vitest';
import { definePort, createAdapter, checkContract } from '../../../src/index';

describe('Ports & Adapters (basic)', () => {
  interface Repo {
    find(id: string): { id: string };
  }

  it('defines port and creates adapter', () => {
    const OrderRepo = definePort<Repo>('OrderRepo');
    const impl = { find: (id: string) => ({ id }) };

    const adapter = createAdapter(OrderRepo, impl, ['find']);

    expect(adapter.port.name).toBe('OrderRepo');
    expect(adapter.impl.find('1').id).toBe('1');
  });

  it('checkContract detects missing', () => {
    const result = checkContract({ foo: 1 }, ['foo', 'bar']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toContain('bar');
  });
});
