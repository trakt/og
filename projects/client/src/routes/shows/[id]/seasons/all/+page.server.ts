import { loadShowEpisodes } from '../../../../../lib/shows/loadShow.ts';

export const load = ({ fetch, locals, parent, params, cookies, url }) =>
  loadShowEpisodes({ fetch, token: locals.token, parent, cookies, url, id: params.id, path: '/seasons/all' });
