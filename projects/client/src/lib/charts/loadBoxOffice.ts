import { error } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import type { DateOrder } from '../utils/formatDate.ts';
import { chartPeriod } from './chartPeriod.ts';
import { toChartCard } from './toChartCard.ts';

// The IMDb weekend box office list the chart is built
const BOX_OFFICE_LIST_ID = '1267169';

type LoadBoxOfficeParams = {
  fetch: typeof fetch;
  /** The layout's data, for the viewer's date format. */
  parent: () => Promise<{ datePreferences: { order: DateOrder } }>;
};

/**
 * Loads the weekend box office: the top 10 with their gross, and the list's
 * description for the under-title. Both are public, so they go without the token. There's no paging.
 */
export async function loadBoxOffice({ fetch, parent }: LoadBoxOfficeParams) {
  const client = api({ fetch });
  const [response, list, { datePreferences }] = await Promise.all([
    client.movies.boxoffice({ query: { extended: 'full,images' } }),
    client.lists.summary({ params: { id: BOX_OFFICE_LIST_ID } }),
    parent(),
  ]);
  if (response.status !== 200) error(502, 'The Trakt API could not load the box office.');

  const now = new Date();
  return {
    type: 'movies' as const,
    chart: 'boxoffice' as const,
    cards: response.body.map((row) => toChartCard(row, { chart: 'boxoffice', now, order: datePreferences.order })),
    /** The weekly default the nav's period links keep, as in OG. */
    period: chartPeriod(undefined),
    page: { type: 'paginated' as const, current: 1, total: 1 },
    /** The under-title and meta description. OG read it off the list, so a list we can't load leaves it blank. */
    description: list.status === 200 ? (list.body.description ?? '') : '',
  };
}
