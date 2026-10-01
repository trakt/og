import { listItemSorts, type ListItemType } from './listItemSorts.ts';
import { readListFilters } from './readListFilters.ts';
import type { ListQuery } from './ListQuery.ts';

const ITEM_TYPES: readonly ListItemType[] = ['movie', 'show', 'season', 'episode', 'person'];
// OG's `params[:limit] ||= 120`, capped at the worker's page limit.
const PER_PAGE = 120;
const MAX_LIMIT = 250;

const positiveInt = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return parsed > 0 ? parsed : fallback;
};

const csv = (value: string | null) => (value ?? '').split(',').map((part) => part.trim()).filter(Boolean);
const isItemType = (value: string): value is ListItemType => ITEM_TYPES.some((type) => type === value);

/**
 * Reads OG's list page query string: `?sort=added,desc&display=movie,show&genres=drama`.
 * A sort OG doesn't know leaves the list's default, but its direction still applies, like `params[:sort_how]`.
 * `display=all` and `genres=all` are no filter.
 */
export function toListQuery(search: URLSearchParams): ListQuery {
  const [by = '', how = ''] = (search.get('sort') ?? '').split(',');
  const sortBy = listItemSorts.find((sort) => sort.by === by)?.by;
  const sortHow = how === 'desc' || how === 'asc' ? how : undefined;

  return {
    ...(sortBy && { sortBy }),
    ...(sortHow && { sortHow }),
    types: [...new Set(csv(search.get('display')).filter(isItemType))],
    genres: csv(search.get('genres')).filter((genre) => genre !== 'all'),
    ...(search.has('hide') && { hide: readListFilters({ search, scope: 'list' }).hide }),
    ...(search.get('terms')?.trim() && { terms: search.get('terms')?.trim() }),
    ...(search.get('watchnow')?.trim() && { watchnow: csv(search.get('watchnow')).join(',') }),
    page: positiveInt(search.get('page'), 1),
    limit: Math.min(positiveInt(search.get('limit'), PER_PAGE), MAX_LIMIT),
  };
}
