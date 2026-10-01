import { loadBuiltInList } from '../../../../../lib/lists/loadBuiltInList.ts';
// OG dropped the `/:type` segment for HTML and opened on All Types, so it's ignored.
export const load = (event: Omit<Parameters<typeof loadBuiltInList>[0], 'kind'>) =>
  loadBuiltInList({ ...event, kind: 'watchlist' });
