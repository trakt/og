import type { HeaderUser } from '../../../lib/components/header/HeaderUser.ts';

// A signed-in VIP viewer for the page's controls (rewatch sends everyone else to the VIP page). The writes still need
// a browser session; screenshots stub the API.
const VIEWER: HeaderUser = { slug: 'demo', firstName: 'Demo', avatarUrl: '', isVip: true };

export const load = () => ({ user: VIEWER });
