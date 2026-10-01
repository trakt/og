import { describe, expect, it } from 'vitest';
import type { OverlayState } from '../../overlay/createOverlay.svelte.ts';
import { quickIconFill } from '../media/quickIconFill.ts';
import { type FadeHideOption, matchesFadeHide, parseFadeHide } from './fadeHide.ts';

const matches = (option: FadeHideOption, state: OverlayState, airedEpisodes?: number) =>
  matchesFadeHide(option, state, quickIconFill({ state, airedEpisodes }));

describe('parseFadeHide', () => {
  it('should keep known options and drop the rest', () => {
    expect(parseFadeHide('watched,bogus,unrated')).toEqual(['watched', 'unrated']);
    expect(parseFadeHide(undefined)).toEqual([]);
    expect(parseFadeHide('')).toEqual([]);
  });
});

describe('matchesFadeHide', () => {
  it('should split shows into watched, partially watched and not watched', () => {
    expect(matches('watched', { watched: true, watchedEpisodes: 10 }, 10)).toBe(true);
    expect(matches('watching', { watched: true, watchedEpisodes: 4 }, 10)).toBe(true);
    expect(matches('watched', { watched: true, watchedEpisodes: 4 }, 10)).toBe(false);
    expect(matches('unwatched', { watched: true, watchedEpisodes: 4 }, 10)).toBe(false);
    expect(matches('unwatched', { watched: false, watchedEpisodes: 0 }, 10)).toBe(true);
  });

  it('should count a watched movie as fully watched', () => {
    expect(matches('watched', { watched: true, plays: 2 })).toBe(true);
    expect(matches('watching', { watched: true, plays: 2 })).toBe(false);
  });

  it('should split the library the same way', () => {
    expect(matches('collected', { collected: true, collectedEpisodes: 10 }, 10)).toBe(true);
    expect(matches('collecting', { collected: true, collectedEpisodes: 3 }, 10)).toBe(true);
    expect(matches('uncollected', { collected: false }, 10)).toBe(true);
  });

  it('should read the watchlist, lists and ratings', () => {
    expect(matches('watchlisted', { watchlisted: true })).toBe(true);
    expect(matches('unwatchlisted', { watchlisted: false })).toBe(true);
    expect(matches('listed', { listed: true })).toBe(true);
    expect(matches('unlisted', { listed: true })).toBe(false);
    expect(matches('rated', { rating: 8 })).toBe(true);
    expect(matches('unrated', { rating: null })).toBe(true);
    expect(matches('unrated', { rating: 8 })).toBe(false);
  });

  it('should match nothing while the state is unknown', () => {
    const options: FadeHideOption[] = ['watched', 'unwatched', 'uncollected', 'unwatchlisted', 'unlisted', 'unrated'];
    expect(options.filter((option) => matches(option, {}, 10))).toEqual([]);
  });
});
