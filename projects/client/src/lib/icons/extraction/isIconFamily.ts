import { iconFamilies } from './iconFamilies.ts';
import type { IconFamily } from './IconFamily.ts';

export function isIconFamily(value: string): value is IconFamily {
  return Object.hasOwn(iconFamilies, value);
}
