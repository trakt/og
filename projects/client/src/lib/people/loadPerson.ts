import { error, redirect } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import type { HeaderUser } from '../components/header/HeaderUser.ts';
import { loadPrivateNote } from '../notes/loadPrivateNote.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { toCreditsQuery } from './toCreditsQuery.ts';
import { toPersonSummary } from './toPersonSummary.ts';

type LoadPersonParams = {
  fetch: typeof fetch;
  /** Only for the viewer's private note. */
  token: string | null;
  /** The layout's data, for the viewer's early-ratings and actor-spoiler settings and note dates. */
  parent: () => Promise<{ settings: ViewerSettings | null; user: HeaderUser | null; datePreferences: DatePreferences }>;
  id: string;
  /** The page URL's query: OG's `?sort=`, `?display=` and `?terms=`, so a shared view renders filtered. */
  search: URLSearchParams;
};

type Response = { status: number; body: unknown };
type Body<R extends Response> = Extract<R, { status: 200 }>['body'];

/** The body of a 200, or null for anything else. The page still renders with no credits. */
const ok = <R extends Response>(request: Promise<R>): Promise<Body<R> | null> =>
  request.then((response) => (response.status === 200 ? response.body : null)).catch(() => null);

/**
 * Loads `/people/:id` for SSR: the person with the layout data (404s and canonical redirects need it), then the
 * movie and show credits, the list count and the private note in parallel. Only the note sends the user's token.
 */
export async function loadPerson({ fetch, token, parent, id: requested, search }: LoadPersonParams) {
  const client = api({ fetch });
  const [summary, { settings, user, datePreferences }] = await Promise.all([
    client.people.summary({ params: { id: requested }, query: { extended: 'full,images' } }),
    parent(),
  ]);
  if (summary.status === 404) error(404, 'Person not found');
  if (summary.status !== 200) error(502, 'The Trakt API could not load this person.');

  const person = summary.body;
  const id = person.ids.slug;
  if (requested !== id) redirect(301, `/people/${id}${search.size > 0 ? `?${search}` : ''}`);

  const notable = { type: 'person', id: person.ids.trakt, slug: id } as const;
  const [movies, shows, lists, note] = await Promise.all([
    ok(client.people.movies({ params: { id }, query: { extended: 'full,images' } })),
    ok(client.people.shows({ params: { id }, query: { extended: 'full,images' } })),
    client.people.lists({ params: { id, type: 'all', sort: 'popular' }, query: { limit: 1 } }).catch(() => null),
    loadPrivateNote({ fetch, token: user ? token : null, item: notable }),
  ]);

  const view = toPersonSummary({
    person,
    movies,
    shows,
    listCount: lists?.status === 200 ? Number(lists.headers.get('x-pagination-item-count')) || 0 : 0,
    earlyRatings: settings?.browsing?.display_early_ratings ?? false,
    random: Math.random(),
    now: new Date(),
  });

  return {
    person: view,
    query: toCreditsQuery(search),
    // OG's `display_actor_episode_counts`.
    hideEpisodeCounts: settings?.browsing?.spoilers?.actors === 'hide',
    privateNotes: {
      item: { ...notable, title: person.name, fanart: view.fanart?.image },
      note,
      signedIn: user !== null,
      datePreferences,
    },
  };
}
