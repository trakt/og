import type { toHiddenItem } from './toHiddenItem.ts';
type Item = NonNullable<ReturnType<typeof toHiddenItem>>;
/** Sort the complete section before paging, so title search never misses a later API page. */
export function hiddenItemsPage({ items, sort, flipped, terms, current, limit = 120 }: {
  items: readonly Item[];
  sort: 'title' | 'date';
  flipped: boolean;
  terms: string;
  current: number;
  limit?: number;
}) {
  const filtered = items.filter((item) => sort !== 'title' || item.sortTitle.includes(terms.trim().toLowerCase()));
  const sorted = filtered.toSorted((a, b) => {
    const order = sort === 'title'
      ? a.sortTitle.localeCompare(b.sortTitle, 'en', { numeric: true })
      : b.hiddenAt.localeCompare(a.hiddenAt);
    return (flipped ? -order : order) || a.key.localeCompare(b.key);
  });
  const total = Math.max(1, Math.ceil(sorted.length / limit));
  const page = Math.min(Math.max(1, current), total);
  return {
    items: sorted.slice((page - 1) * limit, page * limit),
    count: sorted.length,
    meta: { current: page, total },
  };
}
