import type { ListsMode } from './ListsMode.ts';
import type { ListsQuery } from './ListsQuery.ts';
import { sortsFor } from './sortsFor.ts';

/** The query string for a lists view, the inverse of toListsQuery. Defaults are left out. */
export function toListsSearch({ sort, reversed, terms }: ListsQuery, mode: ListsMode): string {
  const params = new URLSearchParams();
  if (sort !== sortsFor(mode)[0].id || reversed) params.set('sort', `${sort},${reversed ? 'desc' : 'asc'}`);
  if (terms.trim()) params.set('terms', terms.trim());
  const search = params.toString().replaceAll('%2C', ',');
  return search ? `?${search}` : '';
}
