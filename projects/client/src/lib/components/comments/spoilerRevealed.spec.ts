import { describe, expect, it } from 'vitest';
import { spoilerRevealed } from './spoilerRevealed.ts';

describe('util: spoilerRevealed', () => {
  it('should reveal list comments and keep unknown items blurred', () => {
    expect(spoilerRevealed({ type: 'list', id: 1, title: 'Faves' }, {})).toBe(true);
    expect(spoilerRevealed(undefined, { watched: true })).toBe(false);
  });

  it('should reveal movies and episodes the viewer watched', () => {
    expect(spoilerRevealed({ type: 'movie', id: 1, title: 'Heat' }, { watched: true, plays: 1 })).toBe(true);
    expect(spoilerRevealed({ type: 'movie', id: 1, title: 'Heat' }, {})).toBe(false);
    expect(spoilerRevealed({ type: 'episode', id: 2, title: 'Pilot', show: 1, season: 1 }, { watched: false })).toBe(
      false,
    );
  });

  it('should reveal shows and seasons only once every aired episode is watched', () => {
    const show = { type: 'show', id: 1, title: 'Breaking Bad', airedEpisodes: 62 } as const;
    expect(spoilerRevealed(show, { watched: true, watchedEpisodes: 62 })).toBe(true);
    expect(spoilerRevealed(show, { watched: true, watchedEpisodes: 61 })).toBe(false);
    expect(spoilerRevealed({ ...show, airedEpisodes: undefined }, { watchedEpisodes: 62 })).toBe(false);
  });
});
