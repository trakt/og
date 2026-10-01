import type { ListItemRow } from './listItemRowsSchema.ts';
import type { ListQuery } from './ListQuery.ts';
import { fetchListItems } from './loadListItems.ts';
import type { ListSort } from './resolveListSort.ts';

/** A list item as the whole-list writes send it: its list item id for reorders, its media for removals. */
export type ListItemRef = { readonly id: number; readonly type: ListItemRow['type']; readonly trakt: number };

const PAGE = 250;
// The stats bar's cap too: enough pages for a VIP's 5,000-item list.
const MAX_PAGES = 20;

const traktId = (row: ListItemRow) => {
  switch (row.type) {
    case 'movie':
      return row.movie.ids.trakt;
    case 'show':
      return row.show.ids.trakt;
    case 'season':
      return row.season.ids.trakt;
    case 'episode':
      return row.episode.ids.trakt;
    case 'person':
      return row.person.ids.trakt;
  }
};

/**
 * Every item matching the page's filters, in a sort, read page by page in the browser: OG's `list_all_item_ids` and
 * `list_filtered_item_ids`. Throws when a page fails or the list is too long to read whole.
 */
export async function fetchListItemRefs({ fetch, base, query, sort }: {
  /** `authenticatedFetch`: a private list only reads with the viewer's token. */
  fetch: typeof globalThis.fetch;
  base: string;
  query: Pick<ListQuery, 'types' | 'genres' | 'hide' | 'terms' | 'watchnow'>;
  sort: ListSort;
}): Promise<readonly ListItemRef[]> {
  const refs: ListItemRef[] = [];
  // ponytail: one page at a time, since most lists fit one; read them in parallel if long lists feel slow.
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { status, rows, headers } = await fetchListItems({
      fetch,
      token: null,
      base,
      query: { ...query, page, limit: PAGE },
      sort,
      extended: 'full',
    });
    if (status !== 200) throw new Error(`List items: ${status}`);
    refs.push(...rows.map((row) => ({ id: row.id, type: row.type, trakt: traktId(row) })));
    // A short page is the last: the worker's page count runs long under a genre filter (`listPageMeta.ts`).
    if (rows.length < PAGE || refs.length >= Number(headers.get('x-pagination-item-count') ?? Infinity)) return refs;
  }
  throw new Error('List too long');
}
