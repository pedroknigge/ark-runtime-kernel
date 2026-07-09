import { createUser, type User } from '../domain/user';

export function registerUser(id: string, email: string): User {
  return createUser(id, email);
}
