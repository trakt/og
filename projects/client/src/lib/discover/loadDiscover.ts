import { error } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import { summerShowcase } from './summerShowcase.ts';
import { toShowcaseSlide } from './toShowcaseSlide.ts';
import { toTopSlide } from './toTopSlide.ts';

type LoadDiscoverParams = {
  fetch: typeof fetch;
  /** The request's cookies, for the VIP sidebar toggle's `hide_sidenav`. */
  cookies: { get: (name: string) => string | undefined };
  parent: () => Promise<{ user: unknown; datePreferences: DatePreferences }>;
  now?: Date;
};

// OG's page size of 10.
const query = { extended: 'full,images', limit: 10 } as const;
const params = { period: 'weekly' } as const;

/**
 * Loads `/discover` for SSR: the top 10 shows and movies by unique watchers over the last 7 days, and every show on
 * the Summer TV Shows list in random order (OG's). All are public, so they go without the
 * viewer's token.
 */
export async function loadDiscover({ fetch, cookies, parent, now = new Date() }: LoadDiscoverParams) {
  const client = api({ fetch });
  const [shows, movies, showcase, { user, datePreferences }] = await Promise.all([
    client.shows.watched({ params, query }),
    client.movies.watched({ params, query }),
    client.lists.items.show({
      params: { id: summerShowcase.listId },
      query: { extended: 'full,images', sort_by: 'random', limit: 'all' },
    }),
    parent(),
  ]);
  if (shows.status !== 200 || movies.status !== 200 || showcase.status !== 200) {
    error(502, 'The Trakt API could not load discover.');
  }

  return {
    topShows: shows.body.map((row) => toTopSlide(row, now)),
    topMovies: movies.body.map((row) => toTopSlide(row, now)),
    summerShows: showcase.body.map(({ show }) =>
      toShowcaseSlide({ show, now, datePreferences, signedIn: user !== null })
    ),
    sidenavHidden: cookies.get('hide_sidenav') !== undefined,
  };
}
