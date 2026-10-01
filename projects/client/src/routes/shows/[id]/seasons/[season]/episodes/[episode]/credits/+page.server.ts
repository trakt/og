import { loadCredits } from '../../../../../../../../lib/credits/loadCredits.ts';

export const load = ({ fetch, parent, params }) =>
  loadCredits({
    fetch,
    parent,
    item: { type: 'episode', id: params.id, season: params.season, episode: params.episode },
  });
