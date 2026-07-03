import type { Order } from './order.js';

/** Port: implemented by an adapter, consumed by the application layer. */
export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | undefined>;
}
