import { collectedDetails } from './collectedDetails.ts';
import type { CollectionMetadata } from '../components/collection/CollectionMetadata.ts';
import { collectedCounts } from './collectedCounts.ts';
import type { LastActivitiesResponse } from '@trakt/api';
import type { OverlaySlices } from './OverlaySlices.ts';
import type { OverlayStorage, SliceName, SliceRecord } from './overlayStorage.ts';
import { type ApiGet, sliceSources } from './sliceSources.ts';
import { staleSlices } from './staleSlices.ts';

type MediaType = 'movie' | 'show' | 'season' | 'episode' | 'person';

/** A poster's user state. Every field is `undefined` while its slice is unknown, so the poster stays idle. */
export type OverlayState = {
  watched?: boolean;
  /** Movies and episodes. */
  plays?: number;
  lastWatchedAt?: string;
  /** All plays in the show or season, including repeat watches. */
  watchedPlays?: number;
  /**
   * Shows: unique non-special episodes. Seasons, when `state` gets the season's show: that season's episodes. Divide by
   * the item's `aired_episodes` for the percentage.
   */
  watchedEpisodes?: number;
  collected?: boolean;
  /** Movies and episodes with their show/season/number supplied, or an optimistic episode id. */
  collectionMetadata?: CollectionMetadata;
  collectedAt?: string;
  /** Shows only: unique non-special episodes. */
  collectedEpisodes?: number;
  /** `null` when the ratings are known and this item has none. */
  rating?: number | null;
  watchlisted?: boolean;
  listed?: boolean;
  favorited?: boolean;
  favoritedAt?: string;
  dropped?: boolean;
  rewatching?: boolean;
  rewatchingAt?: string;
  droppedAt?: string;
  rewatchedEpisodes?: number;
  rewatchedPlays?: number;
};

/** Where a season sits, since the watched and collected slices key seasons by show and number, not season id. */
export type SeasonOf = { show: number; number: number; episode?: number };

type CreateOverlayParams = {
  get: ApiGet;
  storage: OverlayStorage;
  now?: () => number;
};

// The visibility recheck runs at most this often.
const RECHECK_MS = 60_000;

const countEpisodes = (seasons: ReadonlyMap<number, ReadonlyMap<number, unknown>> | undefined) =>
  [...(seasons ?? new Map())].reduce((sum, [number, episodes]) => number === 0 ? sum : sum + episodes.size, 0);

const watchDetails = (dates: readonly string[] | undefined) => ({
  watchedPlays: dates?.length,
  lastWatchedAt: dates?.reduce((latest, date) => date > latest ? date : latest, '') || undefined,
});

const progress = (watchedEpisodes: number | undefined, collectedEpisodes: number | undefined) => ({
  watchedEpisodes,
  watched: watchedEpisodes === undefined ? undefined : watchedEpisodes > 0,
  collectedEpisodes,
  collected: collectedEpisodes === undefined ? undefined : collectedEpisodes > 0,
});

function stateOf(slices: Partial<OverlaySlices>, type: MediaType, id: number, season?: SeasonOf): OverlayState {
  if (type === 'person') return { listed: slices.listed?.person.has(id) };
  const watchlisted = slices.watchlist?.[type]?.has(id);
  const rating = slices.ratings && (slices.ratings[type].get(id) ?? null);
  const listed = slices.listed?.[type].has(id);
  if (type === 'episode') {
    // With its season it's one lookup; without, find the season that has it.
    const dates = slices.watchedShows &&
      (season
        ? slices.watchedShows.get(season.show)?.get(season.number)?.get(id)
        : [...slices.watchedShows.values()].flatMap((seasons) => [...seasons.values()])
          .find((episodes) => episodes.has(id))?.get(id));
    const plays = slices.watchedShows && (dates?.length ?? 0);
    const collection = season?.episode !== undefined
      ? slices.collectedShows?.get(season.show)?.get(season.number)?.get(season.episode)
      : slices.collectedShows &&
        [...slices.collectedShows.values()].flatMap((seasons) => [...seasons.values()]).flatMap((
          episodes,
        ) => [...episodes.values()]).find((item) => typeof item !== 'string' && item.id === id);
    return {
      rating,
      listed,
      watchlisted,
      ...watchDetails(dates),
      collected: slices.collectedShows === undefined
        ? undefined
        : collection !== undefined
        ? true
        : season?.episode !== undefined
        ? false
        : undefined,
      ...collectedDetails(collection),
      plays,
      watched: plays === undefined ? undefined : plays > 0,
    };
  }
  if (type === 'season') {
    if (!season) return { rating, listed, watchlisted };
    const count = (shows: OverlaySlices['watchedShows' | 'collectedShows'] | undefined) =>
      shows && (shows.get(season.show)?.get(season.number)?.size ?? 0);
    const resetAt = slices.rewatching instanceof Map ? slices.rewatching.get(season.show) : undefined;
    const rewatched = resetAt
      ? [...(slices.watchedShows?.get(season.show)?.get(season.number)?.values() ?? [])]
        .map((dates) => dates.filter((date) => date >= resetAt))
      : undefined;
    return {
      rating,
      listed,
      watchlisted,
      rewatchingAt: resetAt || undefined,
      rewatchedEpisodes: rewatched?.filter((dates) => dates.length > 0).length,
      rewatchedPlays: rewatched?.reduce((sum, dates) => sum + dates.length, 0),
      ...progress(count(slices.watchedShows), count(slices.collectedShows)),
      ...watchDetails(
        slices.watchedShows && [...(slices.watchedShows.get(season.show)?.get(season.number)?.values() ?? [])].flat(),
      ),
      rewatching: slices.rewatching?.has(season.show),
    };
  }

  const common = {
    rating,
    listed,
    watchlisted: slices.watchlist?.[type].has(id),
    favorited: slices.favorites?.[type].has(id),
    favoritedAt: slices.favorites?.dates?.[type].get(id),
  };

  if (type === 'movie') {
    const plays = slices.watchedMovies && (slices.watchedMovies.get(id)?.length ?? 0);
    return {
      ...common,
      plays,
      ...watchDetails(slices.watchedMovies?.get(id)),
      watched: plays === undefined ? undefined : plays > 0,
      collected: slices.collectedMovies?.has(id),
      ...collectedDetails(slices.collectedMovies?.get(id)),
    };
  }

  const resetAt = slices.rewatching instanceof Map ? slices.rewatching.get(id) : undefined;
  const rewatched = resetAt
    ? [...(slices.watchedShows?.get(id) ?? [])]
      .filter(([number]) => number > 0)
      .flatMap(([, episodes]) => [...episodes.values()].map((dates) => dates.filter((date) => date >= resetAt)))
    : undefined;
  return {
    ...common,
    ...progress(
      slices.watchedShows && countEpisodes(slices.watchedShows.get(id)),
      slices.collectedShows && countEpisodes(slices.collectedShows.get(id)),
    ),
    ...watchDetails(
      slices.watchedShows && [...(slices.watchedShows.get(id) ?? [])]
        .filter(([number]) => number > 0).flatMap(([, episodes]) => [...episodes.values()].flat()),
    ),
    dropped: slices.dropped?.has(id),
    rewatching: slices.rewatching?.has(id),
    rewatchingAt: resetAt || undefined,
    droppedAt: slices.dropped instanceof Map ? slices.dropped.get(id) || undefined : undefined,
    rewatchedEpisodes: rewatched?.filter((dates) => dates.length > 0).length,
    rewatchedPlays: rewatched?.reduce((sum, dates) => sum + dates.length, 0),
  };
}

/**
 * The signed-in user's library state for posters. Reads are synchronous against memory and reactive, because the
 * slices live in `$state`. `start` loads the cache and checks `last_activities`; `stop` forgets the user.
 */
export function createOverlay({ get, storage, now = Date.now }: CreateOverlayParams) {
  let slices = $state.raw<Partial<OverlaySlices>>({});
  let user: string | null = null;
  // The `last_activities` key each in-memory slice was fetched at.
  let known: Partial<Record<SliceName, string>> = {};
  let inFlight: { user: string; done: Promise<void> } | null = null;
  let checkedAt = -Infinity;

  const apply = ({ name, data, activity }: SliceRecord) => {
    slices = { ...slices, [name]: data };
    known = { ...known, [name]: activity };
  };

  const fetchSlice = async (forUser: string, name: SliceName, activity: string) => {
    const record: SliceRecord = { name, activity, data: await sliceSources[name].load(get) };
    if (user !== forUser) return;
    apply(record);
    if (name !== 'hidden') await storage.save(forUser, record);
  };

  const check = async (forUser: string) => {
    checkedAt = now();
    const response = await get('/sync/last_activities').catch(() => null);
    // Keep the cached slices as they are. The next visibility check retries.
    if (!response?.ok || user !== forUser) return;

    const activities: LastActivitiesResponse = await response.json();
    const stale = staleSlices(known, activities);
    const fetchAll = (names: SliceName[]) =>
      Promise.allSettled(names.map((name) => fetchSlice(forUser, name, sliceSources[name].activity(activities))));

    // A failed slice keeps its previous copy, or stays unknown. Lists cost a request each, so they go last.
    await fetchAll(stale.filter((name) => name !== 'listed'));
    await fetchAll(stale.filter((name) => name === 'listed'));
  };

  const refresh = (): Promise<void> => {
    if (!user) return Promise.resolve();
    if (inFlight?.user === user) return inFlight.done;

    const forUser = user;
    const done = check(forUser).finally(() => {
      if (inFlight?.done === done) inFlight = null;
    });
    inFlight = { user: forUser, done };
    return done;
  };

  const forget = () => {
    slices = {};
    known = {};
    inFlight = null;
  };

  return {
    /**
     * The state of one item. Unknown slices leave their fields `undefined`. A season only gets its watched and
     * collected progress when `season` says which show and number it is. An episode finds its own season, and
     * `season` only makes that a direct lookup.
     */
    state: (type: MediaType, id: number, season?: SeasonOf): OverlayState => stateOf(slices, type, id, season),

    /** Signs `nextUser` in: drops any other user's records, applies the cache, then checks `last_activities`. */
    start: async (nextUser: string): Promise<void> => {
      if (nextUser === user) return;
      forget();
      user = nextUser;

      await storage.clearExcept(nextUser);
      const records = await storage.load(nextUser);
      if (user !== nextUser) return;
      records.filter((record) => Object.hasOwn(sliceSources, record.name)).forEach(apply);
      await refresh();
    },

    /** Signed out or switching users: forgets the state and deletes every cached record. */
    stop: (): Promise<void> => {
      user = null;
      forget();
      return storage.clearExcept(null);
    },

    /** The picker shows the total across every known watchlist type. */
    isHidden: (section: string, type: MediaType, id: number) =>
      slices.hidden?.get(section)?.has(`${type}:${id}`) ?? false,
    watchlistCount: () => Object.values(slices.watchlist ?? {}).reduce((count, ids) => count + ids.size, 0),
    /** The dashboard's library strip must count episodes from the cache: /users/me/stats reports zero. */
    collectionCounts: () => collectedCounts(slices),
    refresh,

    /**
     * Reset Browser Data: deletes every cached record and refetches the signed-in user's slices, even
     * the ones whose `last_activities` key didn't move. Signed out, it only empties the cache.
     */
    reset: async (): Promise<void> => {
      const current = user;
      user = null;
      forget();
      await storage.clearExcept(null);
      // Someone signed in or out while the cache emptied: that start or stop owns the overlay now.
      if (!current || user !== null) return;
      user = current;
      await refresh();
    },

    /** The visibility check: a `refresh` at most once a minute. */
    recheck: (): Promise<void> => now() - checkedAt < RECHECK_MS ? Promise.resolve() : refresh(),

    /**
     * Applies an optimistic write to a loaded slice and returns its rollback. Call it right before the request and
     * roll back if the request fails. An unknown slice is left alone unless the action supplies an initial value. A refetched slice is left alone.
     */
    patch: <K extends SliceName>(
      name: K,
      update: (data: OverlaySlices[K]) => OverlaySlices[K],
      initial?: OverlaySlices[K],
    ): () => void => {
      const before = slices[name];
      const base = before ?? initial;
      if (base === undefined) return () => {};

      const after = update(base);
      slices = { ...slices, [name]: after };
      return () => {
        if (slices[name] === after) slices = { ...slices, [name]: before };
      };
    },
  };
}
