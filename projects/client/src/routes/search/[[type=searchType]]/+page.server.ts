import { loadSearch } from '../../../lib/search/loadSearch.ts';

export const load = ({ fetch, parent, url, params, cookies, locals }) =>
  loadSearch({ fetch, parent, url, cookies, token: locals.token, type: params.type });
