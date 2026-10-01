import { loadMovie } from '../../../lib/movies/loadMovie.ts';

export const load = ({ fetch, locals, parent, params }) =>
  loadMovie({ fetch, token: locals.token, parent, id: params.id });
