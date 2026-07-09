import { login } from '../features/auth/login';
import { hello } from '../features/greetings/hello';

export function boot(user: string): string {
  return `${login(user)} | ${hello(user)}`;
}
