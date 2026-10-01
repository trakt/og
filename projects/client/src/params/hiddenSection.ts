import { hiddenSections } from '../lib/users/hidden/hiddenSections.ts';
export const match = (value: string) => Object.hasOwn(hiddenSections, value);
