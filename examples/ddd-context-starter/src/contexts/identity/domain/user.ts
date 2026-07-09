export type User = { id: string; email: string };

export function createUser(id: string, email: string): User {
  return { id, email: email.trim().toLowerCase() };
}
