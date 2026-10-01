import { type FadeHide, fadeHideOptions, parseFadeHide } from '../components/filters/fadeHide.ts';

type SearchFiltersParams = {
  slug: string;
  search: URLSearchParams;
  cookies: { get: (name: string) => string | undefined };
};

/** one search preference, with Hide only on typed media searches. */
export function searchFilters({ slug, search, cookies }: SearchFiltersParams) {
  const visible = !['people', 'lists', 'users'].includes(slug);
  const options = visible
    ? fadeHideOptions.filter((option) => ['', 'shows'].includes(slug) || !('showsOnly' in option))
    : [];
  const hideOptions = ['shows', 'movies', 'episodes'].includes(slug) ? options : [];
  // The API calls it watchlist; the shared eye menu and cookie call it watchlisted.
  const hide = (search.get('hide') ?? cookies.get('filter-hide-search') ?? '')
    .split(',').map((id) => id === 'watchlist' ? 'watchlisted' : id).join(',');
  const fadeHide: FadeHide = {
    fade: parseFadeHide(cookies.get('filter-fade-search')).filter((id) => options.some((option) => option.id === id)),
    hide: parseFadeHide(hide).filter((id) => hideOptions.some((option) => option.id === id)),
  };
  return { visible, options, hideOptions, fadeHide };
}
