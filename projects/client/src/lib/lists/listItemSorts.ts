/** A list type in OG's type dropdown and in the API's type path segment. */
export type ListItemType = 'movie' | 'show' | 'season' | 'episode' | 'person';

/** The list page's sort menu group. `site` and `votes` get a header over them, `mine` is signed-in only. */
export type ListSortGroup = 'main' | 'site' | 'votes' | 'mine';

export type ListItemSort = {
  readonly by: string;
  readonly label: string;
  readonly group: ListSortGroup;
  /** VIP only in OG: hidden from everyone else, and falls back to Rank in the URL. */
  readonly vip?: true;
  /** The types it applies to. Left out, every type. Hidden when none of the chosen types match. */
  readonly types?: readonly ListItemType[];
};

const ratedTypes: readonly ListItemType[] = ['movie', 'show', 'episode'];

/**
 * OG's list sort options, in menu order. Every one sorts ascending by
 * default, so the URL's `asc` and `desc` are the direction as-is.
 */
export const listItemSorts: readonly ListItemSort[] = [
  { by: 'rank', label: 'Rank', group: 'main' },
  { by: 'added', label: 'Added Date', group: 'main' },
  { by: 'title', label: 'Title', group: 'main' },
  { by: 'released', label: 'Release Date', group: 'main' },
  { by: 'runtime', label: 'Runtime', group: 'main' },
  { by: 'popularity', label: 'Popularity', group: 'main' },
  { by: 'random', label: 'Random', group: 'main' },
  { by: 'percentage', label: 'Trakt Percentage', group: 'site' },
  { by: 'imdb_rating', label: 'IMDB Rating', group: 'site', vip: true, types: ratedTypes },
  { by: 'tmdb_rating', label: 'TMDB User Score', group: 'site', vip: true, types: ratedTypes },
  { by: 'rt_tomatometer', label: 'RT Tomatometer', group: 'site', vip: true, types: ['movie', 'show'] },
  { by: 'rt_audience', label: 'RT Audience Score', group: 'site', vip: true, types: ['movie', 'show'] },
  { by: 'metascore', label: 'Metascore', group: 'site', vip: true, types: ['movie'] },
  { by: 'votes', label: 'Trakt Votes', group: 'votes' },
  { by: 'imdb_votes', label: 'IMDB Votes', group: 'votes', vip: true, types: ratedTypes },
  { by: 'tmdb_votes', label: 'TMDB Votes', group: 'votes', vip: true, types: ratedTypes },
  { by: 'my_rating', label: 'My Rating', group: 'mine' },
  { by: 'watched', label: 'Watched Date', group: 'mine' },
  { by: 'collected', label: 'Collected Date', group: 'mine' },
];
