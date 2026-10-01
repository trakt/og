import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { sumProgressTotals } from './sumProgressTotals.ts';
import type { ProgressTotals } from './ProgressTotals.ts';
import { progressTotalsSchema } from './progressTotalsSchema.ts';

type FetchProgressTotalsParams = {
  fetch: typeof globalThis.fetch;
  token: string | null;
  /** `/users/:id/progress/{watched,collection}`. */
  base: string;
  /** The page's filters, so the strip counts the same shows. */
  filters: Record<string, string>;
  /** Shows across every page, from the page read's `X-Pagination-Item-Count`. */
  total: number;
};

// The worker's page cap. Eight pages is 2,000 shows, the cap the profile's most watched uses.
const LIMIT = 250;
const MAX_PAGES = 8;

function fetchPage({ fetch, token, base, filters }: FetchProgressTotalsParams, page: number) {
  const query = new URLSearchParams({ ...filters, page: String(page), limit: String(LIMIT) });
  return rawApiFetch({ fetch, token, path: `${base}?${query}` }).then(async (response) => {
    if (!response.ok) throw new Error(`progress totals: ${response.status}`);
    return progressTotalsSchema.parse(await response.json());
  });
}

/**
 * The summary strip's totals. The API has no aggregate, so this reads every page at the worker's
 * largest page size, all at once, and sums them. Past 2,000 shows, or on any failure, it gives up and the strip keeps
 * to the show count.
 */
export function fetchProgressTotals(params: FetchProgressTotalsParams): Promise<ProgressTotals | null> {
  const pages = Math.ceil(params.total / LIMIT);
  if (pages > MAX_PAGES) return Promise.resolve(null);

  return Promise.all(Array.from({ length: pages }, (_, i) => fetchPage(params, i + 1)))
    .then((results) => sumProgressTotals(results.flat()))
    .catch(() => null);
}
