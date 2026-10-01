import type { PageMeta } from './PageMeta.ts';

function pageNumber(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
}

/** Reads `X-Pagination-Page` and `X-Pagination-Page-Count` into a {@link PageMeta}. */
export function extractPageMeta(headers: Headers, fallbackPage = 1): PageMeta {
  const pageCount = headers.get('x-pagination-page-count');

  if (pageCount === null) return { type: 'infinite', current: fallbackPage };

  const total = pageNumber(pageCount);
  return { type: 'paginated', current: Math.min(pageNumber(headers.get('x-pagination-page')), total), total };
}
