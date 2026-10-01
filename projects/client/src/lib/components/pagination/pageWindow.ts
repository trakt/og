/** A page number to link, or a gap standing in for the pages skipped between two of them. */
export type PageSlot = number | 'gap';

// OG's pagination settings: the first and last 3 pages, plus
// 1 page either side of the current one.
const OUTER = 3;
const WINDOW = 1;

/**
 * The page numbers OG's numbered pagination shows, with one gap for each run of pages it skips.
 * Same rule as OG's paginator, which never swaps a one-page gap
 * for the page itself.
 */
export function pageWindow(current: number, total: number): PageSlot[] {
  const slots: PageSlot[] = [];

  for (let page = 1; page <= total; page++) {
    const shown = page <= OUTER || page > total - OUTER || Math.abs(current - page) <= WINDOW;
    if (shown) slots.push(page);
    else if (slots.at(-1) !== 'gap') slots.push('gap');
  }

  return slots;
}

/** `url` with its `page` param set to `page`. Page 1 drops the param, like Kaminari. */
export function pageHref(url: URL, page: number): string {
  const params = new URLSearchParams(url.search);
  if (page === 1) params.delete('page');
  else params.set('page', String(page));

  const search = params.toString();
  return url.pathname + (search ? `?${search}` : '');
}
