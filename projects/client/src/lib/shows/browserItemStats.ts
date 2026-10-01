import { createItemStatsQueue } from './createItemStatsQueue.ts';
import { fetchItemStats } from './fetchItemStats.ts';

/** Public counts survive SvelteKit navigation; SSR never schedules these requests. */
export const browserItemStats = createItemStatsQueue({ load: fetchItemStats });
