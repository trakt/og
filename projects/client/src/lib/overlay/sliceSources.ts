import { loadHiddenShows } from './loadHiddenShows.ts';
import { collectionMetadataSchema } from '../components/collection/collectionMetadataSchema.ts';
import { loadFavoriteRows } from '../favorites/loadFavoriteRows.ts';
import type { LastActivitiesResponse } from '@trakt/api';
import type { OverlaySlices } from './OverlaySlices.ts';
import { loadWatchlistExtras } from './loadWatchlistExtras.ts';
import { z } from 'zod/v4';

/** GETs an apiz path (`/sync/...`) with the user's token. */
export type ApiGet = (path: string) => Promise<Response>;

type SliceSource<K extends keyof OverlaySlices> = {
  /** The `last_activities` timestamps that move when this slice changes, joined into one comparable key. */
  activity: (activities: LastActivitiesResponse) => string;
  load: (get: ApiGet) => Promise<OverlaySlices[K]>;
};

type Ids = { ids: { trakt: number } };
type TypedItem = { type: string } & Partial<Record<string, Ids | string | number | null>>;
type WatchedShowsMinimal = Record<string, Record<string, Record<string, string[]>>>;

// The worker's page cap.
const PAGE_LIMIT = 250;
// Shows per page once `limit=all` hits the 99,000-episode guard.
const WATCHED_SHOWS_PAGE = 500;

async function getJson<T>(get: ApiGet, path: string): Promise<{ body: T; pageCount: number }> {
  const response = await get(path);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);

  return { body: await response.json(), pageCount: Number(response.headers.get('X-Pagination-Page-Count') ?? 1) };
}

/** Every page of a paginated array endpoint. Pages after the first are fetched in parallel. */
async function getPages<T>(get: ApiGet, path: string): Promise<T[]> {
  const first = await getJson<T[]>(get, path);
  const separator = path.includes('?') ? '&' : '?';
  const rest = await Promise.all(
    Array.from({ length: first.pageCount - 1 }, (_, i) => getJson<T[]>(get, `${path}${separator}page=${i + 2}`)),
  );

  return [first, ...rest].flatMap(({ body }) => body);
}

function idOf(item: TypedItem): number | undefined {
  const media = item[item.type];
  return typeof media === 'object' ? media?.ids.trakt : undefined;
}

function idsOfType(items: readonly TypedItem[], type: string): ReadonlySet<number> {
  return new Set(items.filter((item) => item.type === type).map(idOf).filter((id) => id !== undefined));
}

function byNumericKey<T>(record: Record<string, T>): ReadonlyMap<number, T> {
  return new Map(Object.entries(record).map(([key, value]) => [Number(key), value]));
}

// Season keys come back as `<season id>|<season number>` with `season_numbers=true`.
function toWatchedShows(pages: readonly WatchedShowsMinimal[]): OverlaySlices['watchedShows'] {
  return new Map(pages.flatMap((page) =>
    Object.entries(page).map(([showId, seasons]) => [
      Number(showId),
      new Map(
        Object.entries(seasons).map(([key, episodes]) => [
          Number(key.split('|').at(1)),
          byNumericKey(episodes),
        ]),
      ),
    ])
  ));
}

async function watchedShowPages(get: ApiGet, page = 1): Promise<WatchedShowsMinimal[]> {
  const path = `/sync/watched/shows?extended=min&season_numbers=true&limit=${WATCHED_SHOWS_PAGE}&page=${page}`;
  const { body } = await getJson<WatchedShowsMinimal>(get, path);
  if (Object.keys(body).length < WATCHED_SHOWS_PAGE) return [body];

  return [body, ...await watchedShowPages(get, page + 1)];
}

async function loadWatchedShows(get: ApiGet): Promise<OverlaySlices['watchedShows']> {
  const path = '/sync/watched/shows?extended=min&season_numbers=true&limit=all';
  const response = await get(path);
  // Over 99,000 unique episodes the worker refuses `limit=all` and asks for pages.
  if (response.status === 413) return toWatchedShows(await watchedShowPages(get));
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);

  return toWatchedShows([await response.json()]);
}

const join = (...timestamps: (string | undefined)[]) => timestamps.join('|');

/** How each slice is fetched, and which `last_activities` fields invalidate it. */
export const sliceSources: { [K in keyof OverlaySlices]: SliceSource<K> } = {
  watchedMovies: {
    activity: (a) => join(a.movies?.watched_at),
    load: async (get) => {
      const { body } = await getJson<Record<string, string[]>>(get, '/sync/watched/movies?extended=min&limit=all');
      return byNumericKey(body);
    },
  },
  watchedShows: {
    activity: (a) => join(a.episodes?.watched_at, a.shows?.hidden_at),
    load: loadWatchedShows,
  },
  rewatching: {
    activity: (a) => `${join(a.episodes?.watched_at, a.shows?.hidden_at)}|dates-v1`,
    load: (get) => loadHiddenShows(get, 'progress_watched_reset'),
  },
  collectedMovies: {
    activity: (a) => `${join(a.movies?.collected_at)}|metadata-v1`,
    load: async (get) => {
      const rows = await getPages<unknown>(get, `/sync/collection/movies?extended=metadata&limit=${PAGE_LIMIT}`);
      const schema = z.array(
        z.object({
          movie: z.object({ ids: z.object({ trakt: z.number() }) }),
          collected_at: z.string(),
          metadata: collectionMetadataSchema.nullish(),
        }),
      );
      return new Map(
        schema.parse(rows).map((
          row,
        ) => [row.movie.ids.trakt, { at: row.collected_at, metadata: row.metadata ?? undefined }]),
      );
    },
  },
  collectedShows: {
    activity: (a) => `${join(a.episodes?.collected_at)}|metadata-v1`,
    load: async (get) => {
      const rows = await getPages<unknown>(get, `/sync/collection/shows?extended=metadata&limit=${PAGE_LIMIT}`);
      const schema = z.array(z.object({
        show: z.object({ ids: z.object({ trakt: z.number() }) }),
        seasons: z.array(
          z.object({
            number: z.number(),
            episodes: z.array(
              z.object({
                number: z.number(),
                collected_at: z.string(),
                ids: z.object({ trakt: z.number() }).nullish(),
                metadata: collectionMetadataSchema.nullish(),
              }),
            ),
          }),
        ),
      }));
      return new Map(
        schema.parse(rows).map((
          { show, seasons },
        ) => [
          show.ids.trakt,
          new Map(
            seasons.map((
              season,
            ) => [
              season.number,
              new Map(
                season.episodes.map((
                  episode,
                ) => [episode.number, {
                  at: episode.collected_at,
                  id: episode.ids?.trakt,
                  metadata: episode.metadata ?? undefined,
                }]),
              ),
            ]),
          ),
        ]),
      );
    },
  },
  ratings: {
    activity: (a) => join(a.movies?.rated_at, a.shows?.rated_at, a.seasons?.rated_at, a.episodes?.rated_at),
    load: async (get) => {
      const items = await getPages<TypedItem & { rating: number }>(get, '/sync/ratings');
      const ofType = (type: string) =>
        new Map(
          items.filter((item) => item.type === type).flatMap((item) => {
            const id = idOf(item);
            return id === undefined ? [] : [[id, item.rating] as const];
          }),
        );
      return { movie: ofType('movie'), show: ofType('show'), season: ofType('season'), episode: ofType('episode') };
    },
  },
  watchlist: {
    // Refetch older movie/show-only caches once to include seasons and episodes.
    activity: (a) =>
      `${
        join(
          a.watchlist?.updated_at,
          a.movies?.watchlisted_at,
          a.shows?.watchlisted_at,
          a.seasons?.watchlisted_at,
          a.episodes?.watchlisted_at,
        )
      }|types-v2`,
    load: async (get) => {
      const [response, extras] = await Promise.all([get('/v3/users/me/watchlist/minimal'), loadWatchlistExtras(get)]);
      if (!response.ok) throw new Error('Watchlist unavailable');
      const body = z.object({ movies: z.array(z.number()), shows: z.array(z.number()) }).parse(await response.json());
      return { movie: new Set(body.movies), show: new Set(body.shows), ...extras };
    },
  },
  favorites: {
    // Force old id-only caches to refetch once for the dates.
    activity: (a) => `${join(a.favorites?.updated_at, a.movies?.favorited_at, a.shows?.favorited_at)}|dates-v1`,
    load: async (get) => {
      const items = await loadFavoriteRows(get);
      const dates = (type: 'movie' | 'show') =>
        new Map(items.flatMap((item) => {
          if (item.type !== type || !item.listed_at) return [];
          const id = item.type === 'movie' ? item.movie.ids.trakt : item.show.ids.trakt;
          return [[id, item.listed_at] as const];
        }));
      return {
        movie: idsOfType(items, 'movie'),
        show: idsOfType(items, 'show'),
        dates: { movie: dates('movie'), show: dates('show') },
      };
    },
  },
  dropped: {
    activity: (a) => `${join(a.shows?.dropped_at)}|dates-v1`,
    load: (get) => loadHiddenShows(get, 'dropped'),
  },
  hidden: {
    activity: () => 'session',
    load: () => Promise.resolve(new Map()),
  },
  listed: {
    activity: (a) => join(a.lists?.updated_at, a.collaborations?.updated_at),
    load: async (get) => {
      // Own and collaborative lists come back without items, so membership costs one request per list.
      const { body: lists } = await getJson<{ id: number }[]>(get, '/v3/users/me/lists');
      const items = (await Promise.all(
        lists.map(({ id }) => getPages<TypedItem>(get, `/lists/${id}/items?limit=${PAGE_LIMIT}`)),
      )).flat();
      return {
        movie: idsOfType(items, 'movie'),
        show: idsOfType(items, 'show'),
        season: idsOfType(items, 'season'),
        episode: idsOfType(items, 'episode'),
        person: idsOfType(items, 'person'),
      };
    },
  },
};
