import type { Money } from '../../../shared/kernel/money';
import { zero } from '../../../shared/kernel/money';

export type Invoice = { id: string; total: Money };

export function emptyInvoice(id: string, currency: string): Invoice {
  return { id, total: zero(currency) };
}
