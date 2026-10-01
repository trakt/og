import type { HistoryType } from '../history/historyTypes.ts';

/** OG's library sort labels. */
export const sortLabels = {
  added: 'Added Date',
  title: 'Title',
  released: 'Release Date',
  runtime: 'Runtime',
  popularity: 'Popularity',
  percentage: 'Percentage',
  votes: 'Votes',
} as const;

export type LibrarySortBy = keyof typeof sortLabels;

/** Each type's sorts that the API serves. Shows take none but Added Date. */
export const librarySorts: Readonly<Record<HistoryType, readonly LibrarySortBy[]>> = {
  all: ['added'],
  movies: ['added', 'title', 'released', 'runtime', 'popularity', 'percentage', 'votes'],
  shows: ['added'],
  episodes: ['added', 'title', 'released', 'percentage', 'votes'],
};

/** `by` when `type` has that sort. */
export const validSort = (type: HistoryType, by: string) => librarySorts[type].find((sort) => sort === by);

export type LibrarySort = {
  readonly by: LibrarySortBy;
  /** OG's `sort_how`: `asc` is each sort's own direction (newest, A to Z, longest, most votes), `desc` flips it. */
  readonly how: 'asc' | 'desc';
};

/** The `/:sort_by/:sort_how` segments. An unknown sort falls back to Added Date, as OG did. */
export function librarySort(type: HistoryType, segments: string | undefined): LibrarySort {
  const [by = '', how] = (segments ?? '').split('/');
  return {
    by: validSort(type, by) ?? 'added',
    how: how === 'desc' ? 'desc' : 'asc',
  };
}

/**
 * The API's `sort_how` for OG's. OG's `asc` sorted descending, except Title, which it
 * reversed so `asc` reads A to Z.
 */
export function apiSortHow({ by, how }: LibrarySort): 'asc' | 'desc' {
  const natural = by === 'title' ? 'asc' : 'desc';
  return how === 'asc' ? natural : natural === 'asc' ? 'desc' : 'asc';
}
