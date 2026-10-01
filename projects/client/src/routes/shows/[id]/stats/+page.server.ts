import { loadStats } from '../../../../lib/stats/loadStats.ts';

export const load = ({ fetch, parent, params }) => loadStats({ fetch, parent, item: { type: 'show', id: params.id } });
