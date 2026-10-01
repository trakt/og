import type { ProgressType } from './progressTypes.ts';

/** OG's progress sort options, in its order. */
export const progressSorts = {
  added: 'Activity Date',
  completed: 'Completion %',
  episodes: 'Episodes Left',
  time: 'Time Left',
  plays: 'Plays',
  released: 'Release Date',
  premiered: 'Premiere Date',
  title: 'Title',
  popularity: 'Popularity',
  runtime: 'Episode Runtime',
  'total-runtime': 'Total Runtime',
  random: 'Random',
} as const;

export type ProgressSortBy = keyof typeof progressSorts;

// Old names OG still took, as the sort and direction they meant. OG showed each as "<Name> (unsupported)".
const DEPRECATED: Readonly<Record<string, readonly [ProgressSortBy, 'asc' | 'desc']>> = {
  activity: ['added', 'asc'],
  'most-completed': ['completed', 'asc'],
  'least-completed': ['completed', 'desc'],
  'most-time': ['time', 'asc'],
  'least-time': ['time', 'desc'],
  'most-plays': ['plays', 'asc'],
  'least-plays': ['plays', 'desc'],
  'recently-aired': ['released', 'asc'],
  'previously-aired': ['released', 'desc'],
  'most-episodes': ['episodes', 'asc'],
  'least-episodes': ['episodes', 'desc'],
  'oldest-activity': ['added', 'desc'],
};

// OG's `asc` is each sort's own order: the most recent, most complete, most played, newest and longest first, but the
// fewest left and A to Z. `literalProgressSort` turns it into a plain ascending or descending order.
const DESCENDING: ReadonlySet<ProgressSortBy> = new Set([
  'added',
  'completed',
  'plays',
  'released',
  'premiered',
  'popularity',
  'total-runtime',
]);

const isSortBy = (value: string): value is ProgressSortBy => Object.hasOwn(progressSorts, value);

export type ProgressSort = {
  /** A listed sort, or an old name OG still took. */
  readonly by: string;
  readonly how: 'asc' | 'desc';
  /** Off for an old name: the dropdown marks it "(unsupported)". */
  readonly supported: boolean;
};

type ProgressSortParams = {
  /** The route's `sort_by/sort_how` rest. */
  segments?: string;
  /** The owner's saved sort (`browsing.progress.*.sort`), read only on their own profile. */
  saved?: { readonly sort?: string | null; readonly sort_how?: string | null } | null;
};

const direction = (value: string | null | undefined) => (value === 'desc' ? 'desc' : 'asc');

/**
 * the URL's sort, else the owner's saved one, else Activity Date ascending. An old
 * name keeps its own direction, so OG forced `asc`; an unknown name falls back to the default.
 */
export function progressSort({ segments, saved }: ProgressSortParams): ProgressSort {
  const [path = '', pathHow] = (segments ?? '').split('/');
  const by = path || saved?.sort || 'added';
  const how = path ? direction(pathHow) : direction(saved?.sort_how);

  if (isSortBy(by)) return { by, how, supported: true };
  if (Object.hasOwn(DEPRECATED, by)) return { by, how: 'asc', supported: false };
  return { by: 'added', how: path ? direction(pathHow) : 'asc', supported: true };
}

/** OG's sort as a literal key order: `asc` is smallest first. */
export function literalProgressSort(
  { by, how }: Pick<ProgressSort, 'by' | 'how'>,
): { by: ProgressSortBy; how: 'asc' | 'desc' } {
  const [sortBy, sortHow] = isSortBy(by) ? [by, how] as const : DEPRECATED[by] ?? ['added', 'asc'] as const;
  if (!DESCENDING.has(sortBy)) return { by: sortBy, how: sortHow };
  return { by: sortBy, how: sortHow === 'asc' ? 'desc' : 'asc' };
}

const titleCase = (value: string) =>
  value.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

/** A sort's dropdown label. Activity Date reads "Watched Date" or "Library Date", after the tab. */
export function progressSortLabel(by: string, type: ProgressType): string {
  if (by === 'added') return type === 'library' ? 'Library Date' : 'Watched Date';
  return isSortBy(by) ? progressSorts[by] : titleCase(by);
}
