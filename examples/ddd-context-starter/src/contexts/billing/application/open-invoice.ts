import { emptyInvoice, type Invoice } from '../domain/invoice';

export function openInvoice(id: string): Invoice {
  return emptyInvoice(id, 'USD');
}
