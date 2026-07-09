import { formatName } from '../../shared/format';

export function hello(name: string): string {
  return `hello ${formatName(name)}`;
}
