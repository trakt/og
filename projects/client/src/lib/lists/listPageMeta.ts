import { extractPageMeta } from '../api/extractPageMeta.ts';
import type { PageMeta } from '../api/PageMeta.ts';

type ListPageMetaParams = { headers: Headers; current: number; limit: number; received: number };

/**
 * The pagination for a page of list items. The worker counts every item on the list even when a genre or hide
 * filter narrows it, so its page count runs long; a short page is the last one.
 */
export function listPageMeta({ headers, current, limit, received }: ListPageMetaParams): PageMeta {
  const meta = extractPageMeta(headers, current);
  if (meta.type !== 'paginated' || received >= limit) return meta;
  return { type: 'paginated', current: meta.current, total: Math.min(meta.total, meta.current) };
}
