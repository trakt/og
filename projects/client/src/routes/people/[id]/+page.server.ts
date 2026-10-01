import { loadPerson } from '../../../lib/people/loadPerson.ts';

export const load = ({ fetch, locals, parent, params, url }) =>
  loadPerson({ fetch, token: locals.token, parent, id: params.id, search: url.searchParams });
