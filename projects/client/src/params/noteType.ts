import { noteTypes } from '../lib/users/notes/noteTypes.ts';

export function match(value: string): value is keyof typeof noteTypes {
  return Object.hasOwn(noteTypes, value);
}
