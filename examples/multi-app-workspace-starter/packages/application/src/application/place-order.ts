import type { Order } from '@gallery/domain/order';
import { validateOrder } from '@gallery/domain/order';

export function placeOrder(input: Order): Order {
  validateOrder(input);
  return input;
}