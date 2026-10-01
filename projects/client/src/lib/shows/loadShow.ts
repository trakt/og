import { episodeResponseSchema, peopleResponseSchema, seasonResponseSchema } from '@trakt/api';
import type { EpisodeResponse, PeopleResponse, SeasonsResponse } from '@trakt/api';
import { z } from 'zod/v4';
import { readFadeHide } from '../components/filters/readFadeHide.ts';
import type { Cookies } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { HeaderUser } from '../components/header/HeaderUser.ts';
import { loadWatchNow } from '../components/watchnow/loadWatchNow.ts';
import { loadPrivateNote } from '../notes/loadPrivateNote.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { toShowEpisodes } from './toShowEpisodes.ts';
import { toShowSummary } from './toShowSummary.ts';

type LoadShowParams = {
  fetch: typeof fetch;
  /** Only for Up Next and the private note: the calls here that are about the viewer. */
  token: string | null;
  parent: () => Promise<{
    settings: ViewerSettings | null;
    user: HeaderUser | null;
    datePreferences: DatePreferences;
  }>;
  id: string;
  /** The subpage under the show, e.g. `/seasons`, kept on the canonical redirect. */
  path?: string;
  cookies?: Cookies;
  url?: URL;
};

type Response = { status: number; body: unknown };
type Body<R extends Response> = Extract<R, { status: 200 }>['body'];

/** `extended=episodes` adds each season's episodes, which `@trakt/api` doesn't type. */
export type SeasonWithEpisodes = SeasonsResponse[number] & { episodes?: readonly EpisodeResponse[] };
/** `extended=guest_stars` adds the guest stars, which `@trakt/api` doesn't type. */
export type ShowPeople = PeopleResponse & { guest_stars?: PeopleResponse['cast'] };

/** The body of a 200, or null for anything else. The summary still renders without its extras. */
const ok = <R extends Response>(request: Promise<R>): Promise<Body<R> | null> =>
  request.then((response) => (response.status === 200 ? response.body : null)).catch(() => null);

// The published schemas use zod 3. Wrap their parsers in zod 4 at this off-contract boundary, retaining the
// extended fields (`episodes` and `guest_stars`) that the base contract would strip.
const seasonsBody = seasonResponseSchema.extend({ episodes: episodeResponseSchema.array().optional() }).array();
const peopleBody = peopleResponseSchema.extend({ guest_stars: peopleResponseSchema.shape.cast });

const raw = async <T>(fetch: typeof globalThis.fetch, path: string, schema: {
  safeParse: (input: unknown) => { success: true; data: T } | { success: false };
}): Promise<T | null> => {
  const response = await rawApiFetch({ fetch, path }).catch(() => null);
  if (!response?.ok) return null;
  const body = z.unknown().transform((input, context) => {
    const parsed = schema.safeParse(input);
    if (parsed.success) return parsed.data;
    context.addIssue({ code: 'custom', message: 'Invalid extended show response' });
    return z.NEVER;
  }).safeParse(await response.json().catch(() => null));
  return body.success ? body.data : null;
};

/**
 * Loads a show page for SSR (`/shows/:id` and its seasons subpages): the summary with the layout data (404s and canonical redirects need it), then everything
 * else in parallel. One seasons call with `extended=episodes` fills both the seasons grid and Recently Aired, so the
 * proxied `/next_episode` and `/last_episode` aren't needed. Everything but Up Next and the private note is public and goes without the token.
 */
export async function loadShowData({ fetch, token, parent, id: requested, path = '' }: LoadShowParams) {
  const client = api({ fetch });
  const [summary, { settings, user, datePreferences }] = await Promise.all([
    client.shows.summary({ params: { id: requested }, query: { extended: 'full,images' } }),
    parent(),
  ]);
  if (summary.status === 404) error(404, 'Show not found');
  if (summary.status !== 200) error(502, 'The Trakt API could not load this show.');

  const show = summary.body;
  const id = show.ids.slug;
  if (requested !== id) redirect(301, `/shows/${id}${path}`);

  // ponytail: OG fell back to the visitor's IP country; og uses US until the viewer's setting says otherwise.
  const country = settings?.browsing?.watchnow?.country?.toLowerCase() || 'us';

  const notable = { type: 'show', id: show.ids.trakt, slug: id } as const;
  const [ratings, stats, people, studios, seasons, watchnow, progress, note] = await Promise.all([
    ok(client.shows.ratings({ params: { id }, query: { extended: 'all' } })),
    ok(client.shows.stats({ params: { id } })),
    raw(fetch, `/shows/${id}/people?extended=guest_stars,images`, peopleBody),
    ok(client.shows.studios({ params: { id } })),
    // ponytail: every episode of every season in one response (~1KB each). Split per season if long runners get slow.
    raw(fetch, `/shows/${id}/seasons?extended=full,images,episodes`, seasonsBody),
    loadWatchNow({
      fetch,
      path: `/shows/${id}`,
      fallback: `/shows/${id}/seasons/1/episodes/1`,
      country,
      settings,
      isVip: user?.isVip ?? false,
    }),
    // A stale token gets a 401 here, and the page renders Next Episode like a logged-out visit.
    token ? ok(api({ fetch, token }).shows.progress.watched({ params: { id }, query: {} })) : null,
    loadPrivateNote({ fetch, token: user ? token : null, item: notable }),
  ]);

  const episodeTypeTags = !settings?.browsing?.hide_episode_type_tags;
  const view = toShowSummary({
    show,
    ratings,
    stats,
    people,
    studios: studios ?? [],
    seasons: seasons ?? [],
    progress: progress ? { next: progress.next_episode } : null,
    signedIn: user !== null,
    rank: watchnow.rank,
    country,
    otherSiteRatings: settings?.browsing?.other_site_ratings ?? true,
    earlyRatings: settings?.browsing?.display_early_ratings ?? false,
    actorSpoilers: settings?.browsing?.spoilers?.actors !== 'hide',
    episodeTypeTags,
    isVip: user?.isVip ?? false,
    datePreferences,
    now: new Date(),
  });
  return {
    raw: show,
    seasons: seasons ?? [],
    signedIn: user !== null,
    episodeTypeTags,
    datePreferences,
    summary: view,
    watchNow: watchnow.button,
    privateNotes: {
      item: { ...notable, title: show.title, year: show.year, fanart: view.fanart },
      note,
      signedIn: user !== null,
      datePreferences,
    },
  };
}

/** `/shows/:id` and `/shows/:id/seasons`: the summary and its Watch Now block. */
export async function loadShow(params: LoadShowParams) {
  const { summary, watchNow, privateNotes, signedIn } = await loadShowData(params);
  return {
    show: summary,
    watchNow,
    privateNotes,
    signedIn,
    filters: readFadeHide({ cookies: params.cookies, scope: 'show' }),
  };
}

/** `/shows/:id/seasons/all`: the summary plus every episode. */
export async function loadShowEpisodes(params: LoadShowParams) {
  const { raw, seasons, signedIn, episodeTypeTags, datePreferences, summary, watchNow, privateNotes } =
    await loadShowData(params);
  return {
    show: summary,
    watchNow,
    privateNotes,
    signedIn,
    filters: readFadeHide({ cookies: params.cookies, search: params.url?.searchParams, scope: 'season' }),
    terms: params.url?.searchParams.get('terms') ?? '',
    sort: params.url?.searchParams.get('sort') ?? 'aired,asc',
    episodes: toShowEpisodes({ show: raw, seasons, signedIn, episodeTypeTags, datePreferences, now: new Date() }),
  };
}
