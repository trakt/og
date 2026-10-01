import { loadSearch } from '../../../lib/search/loadSearch.ts';
import { toDatePreferences } from '../../../lib/settings/toDatePreferences.ts';

/**
 * The search results as a signed-in viewer with a search image type sees them, without signing in: the real loader
 * and page on a public search, with `?image=` standing in for the viewer's `browsing.search.image_type`. `?type=` picks
 * the tab (shows, movies, episodes...). Left out, it's Shows & Movies.
 */
export function load({ fetch, url, cookies }) {
  const datePreferences = toDatePreferences(null);
  const settings = { browsing: { search: { image_type: url.searchParams.get('image') } } };
  return loadSearch({
    fetch,
    cookies,
    url,
    type: url.searchParams.get('type') ?? undefined,
    parent: () => Promise.resolve({ datePreferences, settings }),
  }).then((search) => ({ ...search, datePreferences }));
}
