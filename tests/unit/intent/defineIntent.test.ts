import { describe, it, expect, beforeEach } from 'vitest';
import { defineIntent, defaultIntentRegistry, createIntentRegistry } from '../../../src/index';

describe('defineIntent (Iteration 1)', () => {
  beforeEach(() => {
    // Ensure each test starts with a clean default registry
    defaultIntentRegistry.clear();
  });

  it('creates a callable intent creator with correct name', () => {
    const OrderPlaced = defineIntent<'Domain.Order.OrderPlaced', { orderId: string; amount: number }>(
      'Domain.Order.OrderPlaced'
    );

    expect(OrderPlaced.name).toBe('Domain.Order.OrderPlaced');
    expect(typeof OrderPlaced).toBe('function');
  });

  it('calling the creator produces a correctly shaped DomainEvent', () => {
    const OrderPlaced = defineIntent<'Domain.Order.OrderPlaced', { orderId: string }>(
      'Domain.Order.OrderPlaced'
    );

    const event = OrderPlaced({ orderId: 'o-123' });

    expect(event.intent).toBe('Domain.Order.OrderPlaced');
    expect(event.payload).toEqual({ orderId: 'o-123' });
    expect(event.metadata).toBeDefined();
    expect(typeof event.metadata.occurredAt).toBe('string');
  });

  it('uses the default registry', () => {
    const Foo = defineIntent<'Domain.Test.Foo', { x: number }>('Domain.Test.Foo');

    expect(defaultIntentRegistry.has('Domain.Test.Foo')).toBe(true);
    expect(defaultIntentRegistry.get('Domain.Test.Foo')).toBe(Foo);
  });

  it('throws when defining duplicate intent names in same registry', () => {
    const reg = createIntentRegistry();

    reg.define<'Domain.Dup.Test', {}>('Domain.Dup.Test');

    expect(() => {
      reg.define<'Domain.Dup.Test', {}>('Domain.Dup.Test');
    }).toThrow(/already registered/);
  });
});
