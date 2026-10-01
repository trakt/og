import type { ViewerSettings } from './ViewerSettings.ts';

interface Params {
  spoilers?: NonNullable<ViewerSettings['browsing']>['spoilers'] | null;
  type: 'movie' | 'show' | 'season' | 'episode' | 'person';
  /** Unknown watched state stays protected while the browser loads the overlay. */
  watched?: boolean;
}

/** OG protects unwatched items; even a partially watched show or season reveals its spoilers. */
export function mediaSpoilers({ spoilers, type, watched }: Params) {
  const mode = type === 'episode' ? spoilers?.episodes : type === 'movie' ? spoilers?.movies : spoilers?.shows;
  const protectedItem = type !== 'person' && watched !== true;
  return {
    overview: protectedItem && (mode === 'hide' ||
      (type === 'episode' && (mode === 'hide_overviews' || mode === 'hide_screenshots_overviews'))),
    title: protectedItem && type === 'episode' && mode === 'hide',
    screenshot: protectedItem && type === 'episode' && (mode === 'hide' || mode === 'hide_screenshots_overviews'),
    rating: protectedItem && spoilers?.ratings === 'hide',
  };
}
