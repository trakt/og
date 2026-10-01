import { describe, expect, it } from 'vitest';
import { listPageMeta } from './listPageMeta.ts';

const headers = (page: number, count: number) =>
  new Headers({ 'X-Pagination-Page': String(page), 'X-Pagination-Page-Count': String(count) });

describe('listPageMeta', () => {
  it('should keep the page count for a full page', () => {
    expect(listPageMeta({ headers: headers(1, 3), current: 1, limit: 120, received: 120 }))
      .toEqual({ type: 'paginated', current: 1, total: 3 });
  });

  it('should end on a short page, since filtered counts run long', () => {
    expect(listPageMeta({ headers: headers(1, 3), current: 1, limit: 120, received: 7 }))
      .toEqual({ type: 'paginated', current: 1, total: 1 });
  });
});
