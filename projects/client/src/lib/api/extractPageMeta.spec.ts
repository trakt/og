import { describe, expect, it } from 'vitest';
import { extractPageMeta } from './extractPageMeta.ts';

describe('extractPageMeta', () => {
  it('should read the page and page count', () => {
    const headers = new Headers({ 'X-Pagination-Page': '2', 'X-Pagination-Page-Count': '5' });

    expect(extractPageMeta(headers)).toEqual({ type: 'paginated', current: 2, total: 5 });
  });

  it('should be infinite without a page count', () => {
    expect(extractPageMeta(new Headers(), 3)).toEqual({ type: 'infinite', current: 3 });
  });

  it('should clamp the current page to the page count', () => {
    const headers = new Headers({ 'X-Pagination-Page': '9', 'X-Pagination-Page-Count': '5' });

    expect(extractPageMeta(headers)).toEqual({ type: 'paginated', current: 5, total: 5 });
  });

  it('should fall back to page 1 for garbage or zero', () => {
    const headers = new Headers({ 'X-Pagination-Page': 'nope', 'X-Pagination-Page-Count': '0' });

    expect(extractPageMeta(headers)).toEqual({ type: 'paginated', current: 1, total: 1 });
  });
});
