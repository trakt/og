import { loadSyncs } from '../../../lib/settings/syncs/loadSyncs.ts';
export const load = ({ fetch, locals, parent, url }) => loadSyncs({ fetch, locals, parent, url }, 'all');
