import { userCommentTypes } from '../lib/users/comments/userCommentTypes.ts';

export function match(value: string): value is keyof typeof userCommentTypes {
  return Object.hasOwn(userCommentTypes, value);
}
