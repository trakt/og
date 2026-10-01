import { loadLists } from '../../../../lib/users/lists/loadLists.ts';
export const load = (event) => loadLists({ ...event, mode: 'personal' });
