import type { ListsMode } from './ListsMode.ts';
import type { ListsQuery } from './ListsQuery.ts';
import { sortsFor } from './sortsFor.ts';

/**
 * Reads OG's lists query string: `?sort=title,desc&terms=horror`. In `sort`, `desc` means the direction arrow is
 * flipped (`global.js:3509`), not descending. A sort the mode doesn't have falls back to its default.
 */
export function toListsQuery(search: URLSearchParams, mode: ListsMode): ListsQuery {
  const [by, how] = (search.get('sort') ?? '').split(',');
  const sorts = sortsFor(mode);
  return {
    sort: sorts.find(({ id }) => id === by)?.id ?? sorts[0].id,
    reversed: how === 'desc',
    terms: search.get('terms') ?? '',
  };
}
