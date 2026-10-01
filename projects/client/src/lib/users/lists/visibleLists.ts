import type { ListsQuery } from './ListsQuery.ts';
import { listSorts } from './listSorts.ts';
import { matchesListTerms } from './matchesListTerms.ts';
import type { UserListRow } from './UserListRow.ts';

// the title sort drops a leading article.
const sortableTitle = (name: string) => name.toLowerCase().replace(/^(the |an |a )/, '');

const keys = {
  rank: (row: UserListRow) => row.rank,
  updated: (row: UserListRow) => row.updatedAt,
  title: (row: UserListRow) => sortableTitle(row.name),
  likes: (row: UserListRow) => row.likeCount ?? 0,
  comments: (row: UserListRow) => row.commentCount ?? 0,
  items: (row: UserListRow) => row.itemCount,
} as const;

const compare = (x: string | number, y: string | number) =>
  typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y) : Number(x) - Number(y);

/**
 * The lists as the index shows them (OG's isotope filter and sort): matching the terms, then sorted. Random follows
 * `shuffled`, the row keys in the order the browser dealt them; without it the rows keep their rank order. Ties keep
 * rank order.
 */
export function visibleLists(
  rows: readonly UserListRow[],
  query: ListsQuery,
  shuffled: readonly string[] = [],
): UserListRow[] {
  const matching = rows.filter((row) => matchesListTerms(row, query.terms));
  if (query.sort === 'random') {
    const position = new Map(shuffled.map((key, i) => [key, i]));
    return matching.toSorted((a, b) => (position.get(a.key) ?? a.rank) - (position.get(b.key) ?? b.rank));
  }

  const sort = listSorts.find(({ id }) => id === query.sort) ?? listSorts[0];
  const key = keys[sort.id === 'random' ? 'rank' : sort.id];
  const sign = sort.descending !== query.reversed ? -1 : 1;
  return matching.toSorted((a, b) => sign * compare(key(a), key(b)) || a.rank - b.rank);
}
