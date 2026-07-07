/** PresentationAdapters — web app entry; depends on shared packages, not persistence. */

import { placeOrder } from '@gallery/application/place-order';

export function renderHome() {
  const order = placeOrder({ id: '1', sku: 'ARK-001', quantity: 2 });
  return `Order ${order.id} ready`;
}