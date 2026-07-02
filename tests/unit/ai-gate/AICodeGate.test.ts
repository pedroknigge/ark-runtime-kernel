import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAICodeGate,
  definePolicy,
  defineIntent,
  defaultIntentRegistry,
  elevenLayerProfile,
} from '../../../src/index';

describe('AI Code Gate (basic)', () => {
  beforeEach(() => {
    defaultIntentRegistry.clear();
  });
  it('flags obvious infra imports', () => {
    const gate = createAICodeGate();
    const bad = `import { db } from '../infra/db';`;
    const res = gate.validate(bad);
    expect(res.valid).toBe(false);
    expect(
      res.violations.some(
        (v) => v.ruleId === 'FORBIDDEN_PATTERN' || v.ruleId === 'FORBIDDEN_IMPORT'
      )
    ).toBe(true);
  });

  it('flags type imports, re-exports, dynamic imports, and require calls', () => {
    const gate = createAICodeGate();
    const res = gate.validate(
      [
        `import type { Repo } from '../persistence/repo';`,
        `export { db } from '../database/db';`,
        `const orm = await import('prisma');`,
        `const knex = require('knex');`,
      ].join('\n'),
      { filePath: 'src/domain/order.ts' }
    );

    const forbidden = res.violations.filter((v) => v.ruleId === 'FORBIDDEN_IMPORT');
    expect(forbidden).toHaveLength(4);
    expect(forbidden.every((v) => v.filePath === 'src/domain/order.ts')).toBe(true);
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

  it('flags layer reference violations when a profile and context layer are provided', () => {
    const gate = createAICodeGate({
      architectureProfile: elevenLayerProfile,
      enforceIntentAllowlist: false,
    });

    const res = gate.validate(
      `const repo = 'Adapter.Persistence.OrderRepository';`,
      { layer: 'DomainModel' }
    );

    expect(res.valid).toBe(false);
    expect(res.violations[0].ruleId).toBe('LAYER_REFERENCE_VIOLATION');
    expect(res.violations[0].line).toBe(1);
    expect(res.violations[0].fromLayer).toBe('DomainModel');
    expect(res.violations[0].toLayer).toBe('PersistenceAdapters');
    expect(res.violations[0].target).toBe('Adapter.Persistence.OrderRepository');
  });
});
