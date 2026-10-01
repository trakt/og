import { error, redirect } from '@sveltejs/kit';
import { api } from '../api/api.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import type { HeaderUser } from '../components/header/HeaderUser.ts';
import { loadWatchNow } from '../components/watchnow/loadWatchNow.ts';
import type { DatePreferences } from '../settings/DatePreferences.ts';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { episodeNeighbours } from '../shows/episodeNeighbours.ts';
import { episodeSeasonsSchema } from '../shows/episodeSeasonsSchema.ts';
import { seasonNeighbours } from '../shows/seasonNeighbours.ts';
import type { SubpageItem } from './SubpageItem.ts';
import { subpageWatchNowPath } from './subpageWatchNowPath.ts';
import { toSubpageMedia } from './toSubpageMedia.ts';

type Params = {
  fetch: typeof globalThis.fetch;
  parent: () => Promise<{ datePreferences: DatePreferences; settings: ViewerSettings | null; user: HeaderUser | null }>;
  item: SubpageItem;
  /** The subpage's own path segment: `credits`, `stats`, `lists`, `comments`. */
  suffix: string;
  /** Stats has no sibling arrows and needs no neighbour reads. */
  neighbours?: boolean;
};

type Link = { readonly href: string; readonly label: string };

function assertOk<T extends { status: number }>(response: T, name: string): asserts response is T & { status: 200 } {
  if (response.status === 404) error(404, `${name} not found`);
  if (response.status !== 200) error(502, `The Trakt API could not load this ${name.toLowerCase()}.`);
}

function number(value: string, name: string) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) error(404, `${name} not found`);
  return Number(value);
}

/** The item as `/comments/:id/item` would carry it, plus the arrows' targets, from the public summaries. */
async function readItem(fetch: typeof globalThis.fetch, item: SubpageItem, neighbours: boolean) {
  const client = api({ fetch });
  const { id } = item;
  if (item.type === 'movie') {
    const movie = await client.movies.summary({ params: { id }, query: { extended: 'full,images' } });
    assertOk(movie, 'Movie');
    return { body: { type: 'movie', movie: movie.body } };
  }

  const summary = client.shows.summary({ params: { id }, query: { extended: 'full,images' } });
  if (item.type === 'show') {
    const show = await summary;
    assertOk(show, 'Show');
    return { body: { type: 'show', show: show.body } };
  }

  const season = number(item.season, 'Season');
  if (item.type === 'season' && !neighbours) {
    const [show, found] = await Promise.all([
      summary,
      client.shows.season.info({ params: { id, season }, query: { extended: 'full,images' } }),
    ]);
    assertOk(show, 'Show');
    // A season the show doesn't have answers an empty 204, not a 404.
    if (found.status === 204) error(404, 'Season not found');
    assertOk(found, 'Season');
    return { body: { type: 'season', show: show.body, season: found.body } };
  }
  if (item.type === 'season') {
    const [show, seasons] = await Promise.all([
      summary,
      client.shows.seasons({ params: { id }, query: { extended: 'full,images' } }),
    ]);
    assertOk(show, 'Show');
    assertOk(seasons, 'Seasons');
    const found = seasons.body.find((row) => row.number === season);
    if (!found) error(404, 'Season not found');
    const showHref = `/shows/${show.body.ids.slug}`;
    return {
      body: { type: 'season', show: show.body, season: found },
      ...seasonNeighbours({ showHref, number: season, seasons: seasons.body }),
    };
  }

  const episode = number(item.episode, 'Episode');
  const [show, found, seasonsResponse] = await Promise.all([
    summary,
    client.shows.episode.summary({ params: { id, season, episode }, query: { extended: 'full,images' } }),
    neighbours ? rawApiFetch({ fetch, path: `/shows/${encodeURIComponent(id)}/seasons?extended=episodes` }) : null,
  ]);
  assertOk(show, 'Show');
  assertOk(found, 'Episode');
  if (!seasonsResponse) return { body: { type: 'episode', show: show.body, episode: found.body } };
  if (!seasonsResponse.ok) error(502, 'The Trakt API could not load the seasons.');
  const seasons = episodeSeasonsSchema.safeParse(await seasonsResponse.json().catch(() => null));
  if (!seasons.success) error(502, 'The Trakt API returned invalid seasons data.');
  return {
    body: { type: 'episode', show: show.body, episode: found.body },
    ...episodeNeighbours({
      showHref: `/shows/${show.body.ids.slug}`,
      genres: show.body.genres,
      episode: found.body,
      seasons: seasons.data,
    }),
  };
}

const requestedHref = (item: SubpageItem) => {
  if (item.type === 'movie') return `/movies/${item.id}`;
  if (item.type === 'show') return `/shows/${item.id}`;
  if (item.type === 'season') return `/shows/${item.id}/seasons/${item.season}`;
  return `/shows/${item.id}/seasons/${item.season}/episodes/${item.episode}`;
};

/**
 * The slim header and sidebar every item subpage shares: the item, the previous and next arrows pointing at the sibling's
 * same subpage, and Watch Now. A non-canonical URL redirects to the slug's. Every read is public, so none sends the
 * viewer's token. Run it beside the subpage's own reads.
 */
export async function loadSubpageMedia({ fetch, parent, item, suffix, neighbours = true }: Params) {
  const [read, layout] = await Promise.all([readItem(fetch, item, neighbours), parent()]);
  const { user, settings, datePreferences } = layout;
  const target = subpageWatchNowPath(read.body);
  const watchNow = target
    ? await loadWatchNow({
      fetch,
      ...target,
      country: settings?.browsing?.watchnow?.country?.toLowerCase() || 'us',
      settings,
      isVip: user?.isVip ?? false,
    })
    : null;
  const media = toSubpageMedia({ body: read.body, justwatch: watchNow?.rank?.link });
  if (!media) error(404, 'Not found');
  if (media.href !== requestedHref(item)) redirect(301, `${media.href}/${suffix}`);

  const sibling = (link: Link | undefined) => link && { ...link, href: `${link.href}/${suffix}` };
  return {
    media,
    previous: 'previous' in read ? sibling(read.previous) : undefined,
    next: 'next' in read ? sibling(read.next) : undefined,
    watchNow: watchNow?.button ?? null,
    streamingRank: watchNow?.rank ?? null,
    user,
    settings,
    datePreferences,
  };
}
