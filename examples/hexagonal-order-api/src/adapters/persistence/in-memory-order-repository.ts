import type { Order } from '../../domain/order.js';
import type { OrderRepository } from '../../domain/order-repository.js';

export function createInMemoryOrderRepository(): OrderRepository {
  const orders = new Map<string, Order>();
  return {
    async save(order) {
      orders.set(order.id, order);
    },
    async findById(id) {
      return orders.get(id);
    },
  };
}
