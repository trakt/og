import type { CollectedItem } from './CollectedItem.ts';

type Ids = ReadonlySet<number>;
type ById<T> = ReadonlyMap<number, T>;
/** Season number to episode key to value. Specials are season 0. */
type Seasons<T> = ReadonlyMap<number, ReadonlyMap<number, T>>;

/**
 * The signed-in user's library, as ids and dates only. Every slice is fetched, cached and refreshed on its own,
 * so any of them can be missing, which means that state is unknown.
 */
export type OverlaySlices = {
  /** Movie id to its watch dates, newest first. */
  watchedMovies: ById<readonly string[]>;
  /** Show id to season number to episode id to its watch dates, newest first. */
  watchedShows: ById<Seasons<readonly string[]>>;
  /** Show ids whose watched progress was reset. */
  rewatching: Ids | ById<string>;
  /** Movie id to its collected date. */
  collectedMovies: ById<CollectedItem>;
  /** Show id to season number to episode number to its collected date. */
  collectedShows: ById<Seasons<CollectedItem>>;
  ratings: Readonly<Record<'movie' | 'show' | 'season' | 'episode', ById<number>>>;
  watchlist: Readonly<Record<'movie' | 'show', Ids> & Partial<Record<'season' | 'episode', Ids>>>;
  favorites: Readonly<Record<'movie' | 'show', Ids>> & {
    /** Optional for older cached records. */
    readonly dates?: Readonly<Record<'movie' | 'show', ById<string>>>;
  };
  /** Show ids. */
  dropped: Ids | ById<string>;
  /** Optimistic hides on the current page, section to type:id keys. Never persisted as server truth. */
  hidden: ReadonlyMap<string, ReadonlySet<string>>;
  /** Ids in any of the user's own or collaborative lists. */
  listed: Readonly<Record<'movie' | 'show' | 'season' | 'episode' | 'person', Ids>>;
};
