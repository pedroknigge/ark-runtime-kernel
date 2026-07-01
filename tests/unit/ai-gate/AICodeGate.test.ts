import { describe, it, expect, beforeEach } from 'vitest';
import { createAICodeGate, definePolicy, defineIntent, defaultIntentRegistry } from '../../../src/index';

describe('AI Code Gate (basic)', () => {
  beforeEach(() => {
    defaultIntentRegistry.clear();
  });
  it('flags obvious infra imports', () => {
    const gate = createAICodeGate();
    const bad = `import { db } from '../infra/db';`;
    const res = gate.validate(bad);
    expect(res.valid).toBe(false);
    expect(res.violations.some((v) => v.ruleId === 'FORBIDDEN_PATTERN')).toBe(true);
  });

  it('passes clean code', () => {
    const gate = createAICodeGate();
    const good = `const x = OrderPlaced({ id: '1' });`;
    expect(gate.validate(good).valid).toBe(true);
  });

  it('can use policy for custom AI rules', () => {
    const noDb = definePolicy({
      name: 'No raw db in generated',
      check: (ctx: { source: string }) =>
        ctx.source.includes('rawQuery') ? { message: 'rawQuery forbidden' } : true,
    });
    const gate = createAICodeGate({ policies: [noDb] });
    const res = gate.validate('db.rawQuery("..")');
    expect(res.valid).toBe(false);
    expect(res.violations[0].ruleId).toBe('POLICY_VIOLATION');
  });

  it('flags unknown intent references when allowlist is configured', () => {
    const OrderPlaced = defineIntent<'Domain.Order.Placed', {}>('Domain.Order.Placed');
    const gate = createAICodeGate({ intents: [OrderPlaced] });

    const bad = `bus.publish('Domain.Order.Unknown', {});`;
    const res = gate.validate(bad);
    expect(res.valid).toBe(false);
    expect(res.violations.some((v) => v.ruleId === 'UNKNOWN_INTENT')).toBe(true);
  });

  it('accepts registered intent references', () => {
    const OrderConfirmed = defineIntent<'Domain.Order.Confirmed', {}>('Domain.Order.Confirmed');
    const gate = createAICodeGate({ intents: [OrderConfirmed] });

    const good = `bus.publish('Domain.Order.Confirmed', {});`;
    expect(gate.validate(good).valid).toBe(true);
  });

  it('supports external extensions', () => {
    const gate = createAICodeGate({
      extensions: [
        {
          name: 'no-console',
          analyze: (source) =>
            source.includes('console.log')
              ? [{ ruleId: 'NO_CONSOLE', code: 'NO_CONSOLE', message: 'console.log forbidden' }]
              : [],
        },
      ],
    });

    const res = gate.validate('console.log("hi")');
    expect(res.valid).toBe(false);
    expect(res.violations[0].ruleId).toBe('NO_CONSOLE');
  });
});