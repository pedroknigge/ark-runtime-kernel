import { charge } from '../payments/charge';

export function login(userId: string): string {
  charge(userId, 0);
  return `session:${userId}`;
}
