/**
 * Committed publish smoke consumer.
 * Exercises the main public API surface and prints rich, multi-line observable output
 * so verification can assert real behavior (not just counts).
 */
import {
  defineIntent,
  createEventBus,
  definePolicy,
  createDependencyGraph,
  createMetadataRegistry,
  definePort,
  createAdapter,
  checkContract,
  createSaga,
  createArkKernel,
} from 'ark-runtime-kernel';

const OrderPlaced = defineIntent<'Domain.Order.Placed', { id: string; amt: number }>('Domain.Order.Placed');

const positiveAmount = definePolicy({
  name: 'positive-amount',
  severity: 'hard',
  check: (ctx: { event?: { payload?: { amt?: number } } }) => {
    const p = ctx?.event?.payload;
    if (typeof p?.amt === 'number' && p.amt > 0) return true;
    return { policyName: 'positive-amount', severity: 'hard', message: 'amount must be positive' };
  },
});

const bus = createEventBus({ policies: [positiveAmount] });

const received: unknown[] = [];
bus.subscribe(OrderPlaced, (e) => {
  received.push(e);
});

async function main() {
  const ark = createArkKernel();
  await bus.publish(OrderPlaced, { id: 'smoke-1', amt: 42 });

  const g = createDependencyGraph();
  g.registerDependency('Application.PlaceOrder', 'Domain.Order.Placed', 'declared');
  g.registerEventFlow('Domain.Order.Placed', 'Application.Confirm');

  const m = createMetadataRegistry();
  m.entity('Order', {
    fields: {
      id: { type: 'string', identity: true },
      amt: { type: 'number' },
    },
  });

  interface Repo { find(id: string): { id: string } }
  const repoPort = definePort<Repo>('Repo');
  const impl = { find: (id: string) => ({ id }) };
  const adapter = createAdapter(repoPort, impl, ['find']);
  const contract = checkContract(impl, ['find']);

  const saga = createSaga({
    name: 'SmokeSaga',
    steps: [
      {
        name: 'step-1',
        execute: async (p) => ({ ...p, step1: true }),
      },
    ],
  }, bus);
  await saga.run({});

  // Rich multi-line output for verification
  console.log('=== PUBLISH SMOKE OUTPUT ===');
  console.log('received count:', received.length);
  console.log('history:');
  console.log(JSON.stringify(bus.getHistory(), null, 2));
  console.log('graph mermaid:');
  console.log(g.toMermaid());
  console.log('metadata entities:', m.listEntities().length);
  console.log('adapter contract ok:', contract.ok);
  console.log('kernel profile:', ark.profile.name);
  console.log('saga completed');
  console.log('=== END ===');
}

main().catch((err) => {
  console.error('SMOKE FAILED', err);
  // Do not use process here to avoid TS resolution in minimal smoke tsconfig
  throw err;
});
