/**
 * The header search's type picker, in OG's order. `slug` is OG's `data-type`: the
 * form posts to `/search/<slug>` and the `search_type` cookie stores it. `text` is the `/search/:type` the
 * autocomplete asks, `idType` the `/search/:id_type/:id` lookup. Users has neither: `/search/user` is an API route
 * with no typed contract, so the results page and the autocomplete fetch it raw.
 */
export const searchTypes = [
  { slug: '', label: 'Shows & Movies', text: 'movie,show' },
  { slug: 'shows', label: 'Shows', text: 'show' },
  { slug: 'movies', label: 'Movies', text: 'movie' },
  { slug: 'episodes', label: 'Episodes', text: 'episode' },
  { slug: 'people', label: 'People', text: 'person' },
  { slug: 'lists', label: 'Lists', text: 'list' },
  { slug: 'users', label: 'Users' },
  { slug: 'trakt', label: 'Trakt ID', idType: 'trakt', divider: true },
  { slug: 'imdb', label: 'IMDB ID', idType: 'imdb' },
  { slug: 'tmdb', label: 'TMDB ID', idType: 'tmdb' },
  { slug: 'tvdb', label: 'TVDB ID', idType: 'tvdb' },
] as const satisfies ReadonlyArray<{
  slug: string;
  label: string;
  text?: 'movie,show' | 'show' | 'movie' | 'episode' | 'person' | 'list';
  idType?: string;
  divider?: boolean;
}>;
