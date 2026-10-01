import { listCommentSort } from './listCommentSort.ts';
import type { listCommentSorts } from './listCommentSorts.ts';

export type ListCommentsQuery = {
  readonly sort: keyof typeof listCommentSorts;
  readonly page: number;
  /** OG's `params[:limit] || 100`, capped at 100. */
  readonly limit: number;
};

const positive = (value: string | null) => Math.max(1, Number.parseInt(value ?? '', 10) || 1);

/** A list comments URL's sort, page and page size. */
export function toListCommentsQuery(query: URLSearchParams): ListCommentsQuery {
  return {
    sort: listCommentSort(query),
    page: positive(query.get('page')),
    limit: Math.min(100, positive(query.get('limit') ?? '100')),
  };
}
