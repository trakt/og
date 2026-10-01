import type { SeasonOf } from '../overlay/createOverlay.svelte.ts';

export interface SpoilerTarget {
  readonly type: 'movie' | 'show' | 'season' | 'episode' | 'person';
  readonly id: number;
  readonly season?: SeasonOf;
}
