import { loadDiscover } from '../../lib/discover/loadDiscover.ts';

export const load = ({ fetch, cookies, parent }) => loadDiscover({ fetch, cookies, parent });
