import { loadItemComments } from '../../../../../../../../../lib/comments/loadItemComments.ts';

export const load = ({ fetch, parent, params, url }) =>
  loadItemComments({
    fetch,
    parent,
    url,
    sortBy: params.sort_by,
    item: { type: 'episode', id: params.id, season: params.season, episode: params.episode },
  });
