import { describe, it, expect, vi } from 'vitest';
import { createEventBus, createSaga } from '../../../src/index';

describe('Thin Saga', () => {
  it('executes steps in order and supports compensation on failure', async () => {
    const bus = createEventBus();
    const steps: any[] = [];

    const saga = createSaga(
      {
        name: 'TestSaga',
        steps: [
          {
            name: 'step1',
            execute: async (p) => {
              steps.push('1');
              return { step1: true };
            },
            compensate: async () => {
              steps.push('comp1');
            },
          },
          {
            name: 'step2',
            execute: async () => {
              steps.push('2');
              throw new Error('boom');
            },
            compensate: async () => {
              steps.push('comp2');
            },
          },
        ],
      },
      bus
    );

    await expect(saga.run({})).rejects.toThrow('boom');
    expect(steps).toContain('1');
    expect(steps).toContain('2');
    expect(steps).toContain('comp1');
  });
});
