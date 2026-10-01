import { loadStats } from '../../../../../../../../lib/stats/loadStats.ts';

export const load = ({ fetch, parent, params }) =>
  loadStats({
    fetch,
    parent,
    item: { type: 'episode', id: params.id, season: params.season, episode: params.episode },
  });
