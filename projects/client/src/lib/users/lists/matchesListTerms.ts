import type { UserListRow } from './UserListRow.ts';

/**
 * OG's lists search (`lists.js:268-273`): the name or the description contains the terms, ignoring case. No terms
 * match everything.
 */
export function matchesListTerms(row: Pick<UserListRow, 'name' | 'description'>, terms: string): boolean {
  const needle = terms.trim().toLowerCase();
  if (!needle) return true;
  // ponytail: OG treated the terms as a regex; a plain substring can't throw on "(" and matches what people type.
  return row.name.toLowerCase().includes(needle) || (row.description ?? '').toLowerCase().includes(needle);
}
