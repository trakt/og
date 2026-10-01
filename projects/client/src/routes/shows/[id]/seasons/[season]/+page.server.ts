import { loadSeason } from '../../../../../lib/shows/loadSeason.ts';

export const load = ({ fetch, parent, params, url, cookies }) =>
  loadSeason({ fetch, parent, id: params.id, season: params.season, url, cookies });
