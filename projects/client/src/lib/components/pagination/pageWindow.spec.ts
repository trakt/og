import { describe, expect, it } from 'vitest';
import { pageHref, pageWindow } from './pageWindow.ts';

describe('pageWindow', () => {
  it('should show every page when there are few', () => {
    expect(pageWindow(1, 2)).toEqual([1, 2]);
    expect(pageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('should show the outer pages and the window around the current page', () => {
    expect(pageWindow(10, 20)).toEqual([1, 2, 3, 'gap', 9, 10, 11, 'gap', 18, 19, 20]);
  });

  it('should merge the window into the outer pages near either end', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 'gap', 18, 19, 20]);
    expect(pageWindow(4, 20)).toEqual([1, 2, 3, 4, 5, 'gap', 18, 19, 20]);
    expect(pageWindow(20, 20)).toEqual([1, 2, 3, 'gap', 18, 19, 20]);
  });

  it('should keep a gap even when it hides a single page', () => {
    expect(pageWindow(6, 20)).toEqual([1, 2, 3, 'gap', 5, 6, 7, 'gap', 18, 19, 20]);
  });
});

describe('pageHref', () => {
  it('should set the page and keep the other params', () => {
    expect(pageHref(new URL('https://og.trakt.tv/users/sean/history?genres=drama'), 3))
      .toBe('/users/sean/history?genres=drama&page=3');
  });

  it('should replace an existing page', () => {
    expect(pageHref(new URL('https://og.trakt.tv/lists?page=2&limit=30'), 5)).toBe('/lists?page=5&limit=30');
  });

  it('should drop the param for page 1', () => {
    expect(pageHref(new URL('https://og.trakt.tv/lists?page=2'), 1)).toBe('/lists');
    expect(pageHref(new URL('https://og.trakt.tv/lists?page=2&limit=30'), 1)).toBe('/lists?limit=30');
  });
});
