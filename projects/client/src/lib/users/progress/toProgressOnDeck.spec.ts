import { describe, expect, it } from 'vitest';
import { progressFixture } from './progressFixture.ts';
import { toProgressOnDeck } from './toProgressOnDeck.ts';

const [breakingBad, gameOfThrones, theWire] = progressFixture.watched;

describe('toProgressOnDeck', () => {
  it('should map the next episode and the progress so far', () => {
    if (!breakingBad) throw new Error('no fixture');
    expect(toProgressOnDeck({ row: breakingBad, username: 'sean' })).toEqual({
      showId: 1388,
      showTitle: 'Breaking Bad',
      showHref: '/shows/breaking-bad',
      episodeId: 138845,
      episodeHref: '/shows/breaking-bad/seasons/2/episodes/5',
      episodeNumber: '2x05',
      episodeTitle: 'Breakage',
      episodeBadge: undefined,
      poster: undefined,
      rating: 8.1,
      runtime: 47,
      progressHref: '/users/sean/progress?show=1388',
      progress: { aired: 20, completed: 11, plays: 13, minutesWatched: 611, minutesLeft: 423 },
      rewatching: false,
    });
  });

  it('should badge premieres and flag a rewatch', () => {
    if (!gameOfThrones) throw new Error('no fixture');
    expect(toProgressOnDeck({ row: gameOfThrones, username: 'sean' })).toMatchObject({
      episodeBadge: { label: 'Season Premiere', kind: 'season-premiere' },
      rewatching: true,
    });
  });

  it('should skip a show with nothing left', () => {
    if (!theWire) throw new Error('no fixture');
    expect(toProgressOnDeck({ row: theWire, username: 'sean' })).toBeUndefined();
  });
});
