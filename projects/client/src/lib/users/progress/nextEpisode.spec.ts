import { describe, expect, it } from 'vitest';
import { nextEpisode } from './nextEpisode.ts';

const episodes = [1, 2, 3, 4, 5].map((id) => ({ id }));
const doneIn = (ids: number[]) => ({ id }: { id: number }) => ids.includes(id);

describe('nextEpisode', () => {
  it('should start at the first episode when nothing is watched', () => {
    expect(nextEpisode({ episodes, done: doneIn([]), useLastActivity: false })?.id).toBe(1);
  });

  it('should pick the first unwatched episode after the furthest watched one', () => {
    expect(nextEpisode({ episodes, done: doneIn([1, 3]), latest: 1, useLastActivity: false })?.id).toBe(4);
  });

  it('should pick the episode after the most recently watched one with Calculate Up Next Using', () => {
    expect(nextEpisode({ episodes, done: doneIn([1, 3]), latest: 1, useLastActivity: true })?.id).toBe(2);
  });

  it('should fall back to the furthest episode when the most recent one is not eligible', () => {
    expect(nextEpisode({ episodes, done: doneIn([1, 3]), latest: 99, useLastActivity: true })?.id).toBe(4);
  });

  it('should go back to a gap when nothing after the anchor is left', () => {
    expect(nextEpisode({ episodes, done: doneIn([1, 3, 4, 5]), latest: 5, useLastActivity: true })?.id).toBe(2);
  });

  it('should have no next episode when every episode is done', () => {
    expect(nextEpisode({ episodes, done: doneIn([1, 2, 3, 4, 5]), useLastActivity: false })).toBeUndefined();
  });
});
