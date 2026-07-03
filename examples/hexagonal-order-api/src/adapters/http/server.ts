import { createServer, type Server } from 'node:http';

/** Read-model view served by GET /orders/:id (kept adapter-local on purpose). */
export interface OrderView {
  orderId: string;
  sku: string;
  quantity: number;
  amount: number;
  status: string;
}

export interface HttpDeps {
  placeOrder(input: { sku: string; quantity: number; amount: number }): Promise<string>;
  getOrder(id: string): Promise<OrderView | undefined>;
}

export function createHttpServer(deps: HttpDeps): Server {
  return createServer(async (req, res) => {
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    try {
      if (req.method === 'POST' && req.url === '/orders') {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        const body = JSON.parse(raw || '{}');
        const orderId = await deps.placeOrder({
          sku: String(body.sku ?? ''),
          quantity: Number(body.quantity),
          amount: Number(body.amount),
        });
        return json(201, { orderId });
      }

      const match = req.url?.match(/^\/orders\/([^/]+)$/);
      if (req.method === 'GET' && match) {
        const order = await deps.getOrder(match[1]);
        return order ? json(200, order) : json(404, { error: 'order not found' });
      }

      return json(404, { error: 'not found' });
    } catch (err) {
      return json(400, { error: err instanceof Error ? err.message : 'bad request' });
    }
  });
}
