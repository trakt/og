import { loadDashboard } from '../../lib/dashboard/loadDashboard.ts';
export const load = (event) => {
  event.depends('trakt:dashboard');
  return loadDashboard({ ...event, panelFetch: globalThis.fetch });
};
