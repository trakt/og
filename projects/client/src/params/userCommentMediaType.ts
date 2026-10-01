import { userCommentMediaTypes } from '../lib/users/comments/userCommentMediaTypes.ts';

export function match(value: string): value is keyof typeof userCommentMediaTypes {
  return Object.hasOwn(userCommentMediaTypes, value);
}
