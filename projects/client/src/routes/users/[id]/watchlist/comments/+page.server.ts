import { loadBuiltInListComments } from '../../../../../lib/lists/comments/loadBuiltInListComments.ts';
export const load = (event: Omit<Parameters<typeof loadBuiltInListComments>[0], 'kind'>) =>
  loadBuiltInListComments({ ...event, kind: 'watchlist' });
