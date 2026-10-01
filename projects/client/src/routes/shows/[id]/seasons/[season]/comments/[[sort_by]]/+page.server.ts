import { loadItemComments } from '../../../../../../../lib/comments/loadItemComments.ts';

export const load = ({ fetch, parent, params, url }) =>
  loadItemComments({
    fetch,
    parent,
    url,
    sortBy: params.sort_by,
    item: { type: 'season', id: params.id, season: params.season },
  });
