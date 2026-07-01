import { describe, it, expect } from 'vitest';
import { createEventBus, createSaga } from '../../../src/index';

describe('Saga compatibility wrapper', () => {
  it('executes steps in order and supports compensation on failure', async () => {
    const bus = createEventBus();
    const steps: string[] = [];

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

    expect(saga.status).toBe('idle');
    await expect(saga.run({})).rejects.toThrow('boom');
    expect(saga.status).toBe('failed');
    expect(saga.completedSteps).toEqual(['step1']);
    expect(steps).toContain('1');
    expect(steps).toContain('2');
    expect(steps).toContain('comp1');
  });

  it('exposes completed status and returns a defensive completedSteps copy', async () => {
    const bus = createEventBus();
    const saga = createSaga(
      {
        name: 'CompleteSaga',
        steps: [
          { name: 'a', execute: async () => ({ a: true }) },
          { name: 'b', execute: async () => ({ b: true }) },
        ],
      },
      bus
    );

    await saga.run({});

    expect(saga.status).toBe('completed');
    expect(saga.completedSteps).toEqual(['a', 'b']);

    const copy = saga.completedSteps;
    copy.push('external');
    expect(saga.completedSteps).toEqual(['a', 'b']);
  });
});
