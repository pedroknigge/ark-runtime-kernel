import { describe, it, expect } from 'vitest';
import {
  checkAdapterGovernance,
  checkContract,
  createAdapter,
  definePort,
} from '../../../src/index';

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

  it('records port ownership metadata and allows approved adapters', () => {
    const OrderRepo = definePort<Repo>('OrderRepo', {
      ownerLayer: 'ApplicationOrchestration',
      intent: 'Application.Port.OrderRepo',
      allowedAdapters: ['Adapter.Persistence.SqlOrderRepo'],
    });
    const impl = { find: (id: string) => ({ id }) };

    const adapter = createAdapter(OrderRepo, impl, {
      name: 'Adapter.Persistence.SqlOrderRepo',
      layer: 'PersistenceAdapters',
      intent: 'Adapter.Persistence.SqlOrderRepo',
      requiredKeys: ['find'],
    });

    expect(adapter.port.ownerLayer).toBe('ApplicationOrchestration');
    expect(checkAdapterGovernance(adapter).ok).toBe(true);
  });

  it('rejects adapters that are not explicitly allowed by the port', () => {
    const OrderRepo = definePort<Repo>('OrderRepo', {
      allowedAdapters: ['Adapter.Persistence.SqlOrderRepo'],
    });
    const impl = { find: (id: string) => ({ id }) };

    expect(() =>
      createAdapter(OrderRepo, impl, {
        name: 'Adapter.Integration.RemoteOrderRepo',
        requiredKeys: ['find'],
      })
    ).toThrow('not allowed for port');

    const governance = checkAdapterGovernance({
      name: 'Adapter.Integration.RemoteOrderRepo',
      port: OrderRepo,
      impl,
    });
    expect(governance.ok).toBe(false);
    if (!governance.ok) {
      expect(governance.issues[0].ruleId).toBe('ADAPTER_NOT_ALLOWED_FOR_PORT');
    }
  });
});
