import { networkTypes } from '../lib/users/network/networkTypes.ts';

export function match(value: string): value is keyof typeof networkTypes {
  return Object.hasOwn(networkTypes, value);
}
