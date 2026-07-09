import { formatName } from '../../shared/format';

export function login(user: string): string {
  return `session:${formatName(user)}`;
}
