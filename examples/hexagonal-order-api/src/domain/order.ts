/**
 * Domain: pure business model. Imports nothing outside src/domain/.
 */

export interface Order {
  id: string;
  sku: string;
  quantity: number;
  amount: number;
  status: 'placed';
}

/** Intent produced when an order is placed. Defined here, registered in main.ts. */
export const ORDER_PLACED = 'Domain.Order.OrderPlaced' as const;

export interface OrderPlacedPayload {
  orderId: string;
  sku: string;
  quantity: number;
  amount: number;
}

export function placeOrder(input: {
  id: string;
  sku: string;
  quantity: number;
  amount: number;
}): Order {
  if (!input.sku) throw new Error('sku is required');
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    throw new Error('quantity must be a positive integer');
  }
  if (input.amount <= 0) throw new Error('amount must be positive');
  return { ...input, status: 'placed' };
}
