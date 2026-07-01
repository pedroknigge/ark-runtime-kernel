import { describe, expect, it } from 'vitest';
import {
  createAuditTrail,
  createEventBus,
  createWorkflowEngine,
} from '../../../src/index';

describe('WorkflowEngine', () => {
  it('persists snapshots, retries failed steps, and audits progress', async () => {
    const audit = createAuditTrail();
    const bus = createEventBus();
    const engine = createWorkflowEngine(bus, { auditTrail: audit });
    let attempts = 0;

    engine.register({
      name: 'OrderFulfillment',
      steps: [
        {
          name: 'reserve',
          retry: { attempts: 2 },
          execute: () => {
            attempts += 1;
            if (attempts === 1) throw new Error('temporary');
            return { reserved: true };
          },
        },
        {
          name: 'capture',
          execute: () => ({ captured: true }),
        },
      ],
    });

    const snapshot = await engine.start('OrderFulfillment', {});

    expect(snapshot.status).toBe('completed');
    expect(snapshot.completedSteps).toEqual(['reserve', 'capture']);
    expect(snapshot.attempts.reserve).toBe(2);
    expect(await engine.get(snapshot.id)).toMatchObject({ status: 'completed' });
    expect(await audit.query({ type: 'workflow.step.completed' })).toHaveLength(2);
  });
});
