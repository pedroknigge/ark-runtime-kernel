import { describe, expect, it } from 'vitest';
import arkEslint, {
  noDomainInfraImports,
  noRawEventPublish,
  requirePublishSource,
} from '../../../src/eslint/index';

function createContext(filename = '/repo/src/domain/order.ts') {
  const reports: Array<Record<string, unknown>> = [];
  return {
    reports,
    context: {
      getFilename: () => filename,
      report: (descriptor: Record<string, unknown>) => reports.push(descriptor),
    },
  };
}

describe('Ark ESLint plugin', () => {
  it('exports recommended rules', () => {
    expect(Object.keys(arkEslint.rules)).toEqual([
      'no-domain-infra-imports',
      'no-raw-event-publish',
      'require-publish-source',
    ]);
    expect(arkEslint.configs?.recommended).toBeDefined();
  });

  it('flags infrastructure imports from domain files', () => {
    const { context, reports } = createContext();
    const listener = noDomainInfraImports.create(context);

    listener.ImportDeclaration({
      source: { value: '../adapters/persistence/orderRepo' },
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe('forbiddenImport');
  });

  it('flags raw event publish calls', () => {
    const { context, reports } = createContext('/repo/src/application/placeOrder.ts');
    const listener = noRawEventPublish.create(context);

    listener.CallExpression({
      callee: { property: { name: 'publish' } },
      arguments: [
        {
          properties: [{ key: { name: 'intent' }, value: { value: 'Domain.Order.Placed' } }],
        },
      ],
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe('rawPublish');
  });

  it('requires publish metadata source', () => {
    const { context, reports } = createContext('/repo/src/application/placeOrder.ts');
    const listener = requirePublishSource.create(context);

    listener.CallExpression({
      callee: { property: { name: 'publish' } },
      arguments: [{ name: 'OrderPlaced' }, { properties: [] }],
    });
    listener.CallExpression({
      callee: { property: { name: 'publish' } },
      arguments: [
        { name: 'OrderPlaced' },
        { properties: [] },
        { properties: [{ key: { name: 'source' }, value: { value: 'Application.PlaceOrder' } }] },
      ],
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].messageId).toBe('missingSource');
  });
});
