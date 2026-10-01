import { z } from 'zod/v4';
import { listItemRowsSchema } from './listItemRowsSchema.ts';
import type { ListQuery } from './ListQuery.ts';
import type { ListSort } from './resolveListSort.ts';
import type { BuiltInListKind } from './toBuiltInListView.ts';

/** Fetch all pages before changing ranks. A missing, malformed, or shifting page must never produce a partial order. */
export async function loadOwnerItems({ kind, request, selection }: {
  kind: BuiltInListKind;
  selection?: { query: ListQuery; sort: ListSort };
  request: (path: string) => Promise<Response>;
}) {
  const read = async (page: number) => {
    const path = selection
      ? `/users/me/${kind}/${selection.query.types.join(',') || 'all'}/${selection.sort.by}/${selection.sort.how}`
      : `/sync/${kind}/all/rank/asc`;
    const search = new URLSearchParams({ extended: 'full,images', limit: '250', page: String(page) });
    if (selection?.query.genres.length) search.set('genres', selection.query.genres.join(','));
    if (selection?.query.terms) search.set('terms', selection.query.terms);
    if (selection?.query.watchnow) search.set('watchnow', selection.query.watchnow);
    if (selection?.query.hide?.length) search.set('hide', selection.query.hide.join(','));
    const response = await request(`${path}?${search}`);
    if (!response.ok) throw new Error('Could not load your complete list.');
    const body = z.array(z.unknown()).parse(await response.json());
    const rows = listItemRowsSchema.parse(body);
    if (rows.length !== body.length) throw new Error('Invalid list item.');
    const total = z.coerce.number().int().nonnegative().parse(
      response.headers.get('x-pagination-item-count') ?? undefined,
    );
    return { rows, total };
  };
  const first = await read(1);
  const pages = Math.ceil(first.total / 250);
  if (pages > 100) throw new Error('List is too large to reorder safely.');
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => read(i + 2)));
  const rows = [first, ...rest].flatMap(({ rows }) => rows);
  if (
    rest.some(({ total }) => total !== first.total) || rows.length !== first.total ||
    new Set(rows.map(({ id }) => id)).size !== first.total
  ) throw new Error('List changed while loading. Try again.');
  return rows;
}
