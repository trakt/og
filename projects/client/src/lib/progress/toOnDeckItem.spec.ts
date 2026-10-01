import { describe, expect, it } from 'vitest';
import { toOnDeckItem } from './toOnDeckItem.ts';
import type { UpNextEntry } from './UpNextEntry.ts';
import { upNextFixture } from './upNextFixture.ts';

const byTitle = (entries: readonly UpNextEntry[], title: string) => {
  const entry = entries.find(({ show }) => show.title === title);
  if (!entry) throw new Error(`no fixture for ${title}`);
  return entry;
};

describe('toOnDeckItem', () => {
  it('should map the next episode, links and progress', () => {
    const item = toOnDeckItem({ entry: byTitle(upNextFixture.entries, 'Breaking Bad'), username: 'sean' });

    expect(item).toMatchObject({
      showId: 1388,
      showTitle: 'Breaking Bad',
      showHref: '/shows/breaking-bad',
      episodeHref: '/shows/breaking-bad/seasons/2/episodes/5',
      episodeNumber: '2x05',
      episodeTitle: 'Breakage',
      rating: 8.1,
      runtime: 47,
      progressHref: '/users/sean/progress?show=1388',
      progress: { aired: 62, completed: 11, plays: 11, minutesWatched: 517, minutesLeft: 2397 },
      rewatching: false,
    });
    expect(item?.fullProgress).toBeUndefined();
    expect(item?.poster).toBeUndefined();
  });

  it('should tag premieres and finales', () => {
    const item = toOnDeckItem({ entry: byTitle(upNextFixture.entries, 'The Office'), username: 'sean' });

    expect(item?.episodeBadge).toEqual({ label: 'Season Finale', kind: 'season-finale' });
    expect(toOnDeckItem({ entry: byTitle(upNextFixture.entries, 'Breaking Bad'), username: 'sean' })?.episodeBadge)
      .toBeUndefined();
  });

  it('should use absolute numbers for anime', () => {
    const item = toOnDeckItem({ entry: byTitle(upNextFixture.entries, 'Attack on Titan'), username: 'sean' });

    expect(item?.episodeNumber).toBe('2x03 (28)');
  });

  it('should take the whole show from the lifetime entry while rewatching', () => {
    const item = toOnDeckItem({
      entry: byTitle(upNextFixture.entries, 'Lost'),
      lifetime: byTitle(upNextFixture.lifetime, 'Lost'),
      username: 'sean',
    });

    expect(item?.rewatching).toBe(true);
    expect(item?.progress).toMatchObject({ aired: 118, completed: 5, plays: 5 });
    expect(item?.fullProgress).toMatchObject({ aired: 118, completed: 118, plays: 123 });
  });

  it('should size the poster as a thumb', () => {
    const entry = byTitle(upNextFixture.entries, 'The Wire');
    const withPoster: UpNextEntry = {
      ...entry,
      show: {
        ...entry.show,
        images: {
          poster: ['media.trakt.tv/images/shows/000/001/421/posters/medium/abc.jpg.webp'],
          fanart: [],
          logo: [],
          clearart: [],
          banner: [],
          thumb: [],
        },
      },
    };

    expect(toOnDeckItem({ entry: withPoster, username: 'sean' })?.poster).toBe(
      'https://media.trakt.tv/images/shows/000/001/421/posters/thumb/abc.jpg.webp',
    );
  });

  it('should skip a show with no next episode', () => {
    const entry = byTitle(upNextFixture.entries, 'Mad Men');
    const done = { ...entry, progress: { ...entry.progress, next_episode: null } };

    expect(toOnDeckItem({ entry: done, username: 'sean' })).toBeUndefined();
  });

  it('should prefer the season poster with that setting', () => {
    const entry = byTitle(upNextFixture.entries, 'Breaking Bad');

    expect(toOnDeckItem({ entry, username: 'sean', seasonPoster: 'https://example.com/season.jpg' })?.poster).toBe(
      'https://example.com/season.jpg',
    );
  });

  it("should keep each episode's watched state for the exact bar, and none for an empty show", () => {
    const entry = byTitle(upNextFixture.entries, 'Breaking Bad');

    expect(toOnDeckItem({ entry, username: 'sean', ticks: [true, false] })?.ticks).toEqual([true, false]);
    expect(toOnDeckItem({ entry, username: 'sean', ticks: [] })?.ticks).toBeUndefined();
  });
});
