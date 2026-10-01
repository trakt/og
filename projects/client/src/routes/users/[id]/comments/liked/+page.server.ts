import { loadUserComments } from '../../../../../lib/users/comments/loadUserComments.ts';
export const load = (event: Omit<Parameters<typeof loadUserComments>[0], 'liked'>) =>
  loadUserComments({ ...event, liked: true });
