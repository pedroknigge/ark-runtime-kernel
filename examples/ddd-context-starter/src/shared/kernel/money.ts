/** Shared kernel — keep thin. */
export type Money = { amount: number; currency: string };

export function zero(currency: string): Money {
  return { amount: 0, currency };
}
