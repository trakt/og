import { loadEpisode } from '../../../../../../../lib/shows/loadEpisode.ts';

export const load = ({ fetch, parent, params, url }) =>
  loadEpisode({ fetch, parent, id: params.id, season: params.season, episode: params.episode, url });
