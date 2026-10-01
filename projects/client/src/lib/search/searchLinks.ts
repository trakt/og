import { searchTypes } from '../components/header/searchTypes.ts';
import type { SearchType } from './SearchType.ts';
import { isIdType } from './isIdType.ts';

/**
 * The "Trakt" type nav: the text tabs, or the four ID tabs in ID mode. Each link
 * keeps the query and filters, and drops page so a new tab starts on page 1.
 */
export function searchLinks(current: SearchType, query: string, search = new URLSearchParams()) {
  const params = new URLSearchParams(search);
  for (const name of ['page', 'q', 'query']) params.delete(name);
  if (query) params.set('query', query);
  const suffix = params.size > 0 ? `?${params}` : '';
  const idMode = isIdType(current);
  return searchTypes
    .filter((type) => isIdType(type) === idMode)
    .map((type) => ({
      // The header's picker says "Trakt ID"; the nav just "Trakt".
      label: type.label.replace(/ ID$/, ''),
      href: `/search${type.slug ? `/${type.slug}` : ''}${suffix}`,
      current: type.slug === current.slug,
    }));
}
