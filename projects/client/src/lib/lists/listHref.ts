import type { ListItemType } from './listItemSorts.ts';
import type { ListSort } from './resolveListSort.ts';

type ListHrefChange = {
  readonly terms?: string;
  readonly hide?: readonly string[];
  readonly sort?: ListSort;
  readonly types?: readonly ListItemType[];
  readonly genres?: readonly string[];
};

function setList(query: URLSearchParams, key: string, values: readonly string[]) {
  if (values.length === 0) query.delete(key);
  else query.set(key, values.join(','));
}

/**
 * The list page with one control changed (`filterSortableQueryString`, `global.js:3730-3818`): back to page one,
 * the rest of the query kept, `sort` written as `by,how`, and no `display` or `genres` for All Types and All Genres.
 */
export function listHref(url: URL, change: ListHrefChange): string {
  const query = new URLSearchParams(url.searchParams);
  query.delete('page');
  if (change.hide) query.set('hide', change.hide.join(','));
  if (change.terms !== undefined) {
    if (change.terms) query.set('terms', change.terms);
    else query.delete('terms');
  }
  if (change.types) setList(query, 'display', change.types);
  if (change.genres) setList(query, 'genres', change.genres);
  if (change.sort) query.set('sort', `${change.sort.by},${change.sort.how}`);

  // OG's `decodeURIComponent($.param(query))`: commas stay readable.
  const search = query.toString().replaceAll('%2C', ',');
  return `${url.pathname}${search ? `?${search}` : ''}`;
}
