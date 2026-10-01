import { describe, expect, it } from 'vitest';
import { noteRowsSchema } from './noteRowsSchema.ts';
import { toNote } from './toNote.ts';

const preferences = { order: 'dmy', hour24: true, timeZone: 'America/Los_Angeles', weekStartDay: 1 } as const;
const movie = {
  title: 'Fight Club',
  ids: { trakt: 1, slug: 'fight-club-1999' },
  images: { poster: 'media.trakt.tv/posters/medium/1.jpg' },
};
const user = { username: 'tester', name: 'OG Tester', ids: { slug: 'og_tester' }, vip: true, vip_years: 7 };
const note = { id: 1, notes: 'A note', privacy: 'friends', spoiler: true, updated_at: '2026-09-29T01:00:00Z', user };
const map = (row: unknown) =>
  toNote(noteRowsSchema.parse([row]).at(0) as ReturnType<typeof noteRowsSchema.parse>[number], preferences);
const row = { type: 'movie', movie, note, attached_to: { type: 'movie' } };

describe('toNote', () => {
  it('should format dates in the viewer timezone and preserve privacy, spoilers and VIP identity', () => {
    const result = map(row);
    expect(result).toMatchObject({
      text: 'A note',
      privacy: 'friends',
      spoiler: true,
      concealed: true,
      updatedDate: '28 Sep 2026 18:00',
      author: { name: 'OG Tester', href: '/users/og_tester', vip: { years: 7 } },
      item: { href: '/movies/fight-club-1999', image: 'https://media.trakt.tv/posters/thumb/1.jpg' },
    });
  });

  it('should retain the year and available fanart for the shared editor', () => {
    expect(
      map({ ...row, movie: { ...movie, year: 1999, images: { fanart: ['media.trakt.tv/fanarts/full/1.jpg'] } } })?.item,
    )
      .toMatchObject({ year: 1999, fanart: 'https://media.trakt.tv/fanarts/medium/1.jpg' });
  });

  it('should show activity labels and dates without blurring attached spoilers', () => {
    expect(map({ ...row, attached_to: { type: 'history', watched_at: '2026-09-29T01:00:00Z' } })).toMatchObject({
      concealed: false,
      activity: { label: 'History', date: '28 Sep 2026 18:00' },
    });
    expect(map({ ...row, attached_to: { type: 'collection', collected_at: '2026-09-29T01:00:00Z' } })?.activity)
      .toMatchObject({ label: 'Library' });
    expect(map({ ...row, attached_to: { type: 'rating', rating: 7, rated_at: '2026-09-29T01:00:00Z' } })?.activity)
      .toMatchObject({ label: 'Rating', rating: 7 });
  });

  it('should link episodes and seasons under their show with separate show titles', () => {
    const show = { title: 'Breaking Bad', ids: { trakt: 2, slug: 'breaking-bad' } };
    expect(
      map({ ...row, type: 'episode', show, episode: { title: 'Pilot', season: 1, number: 1, ids: { trakt: 3 } } })
        ?.item,
    ).toMatchObject({
      title: '1x01 Pilot',
      episodeBadge: { kind: 'series-premiere', label: 'Series Premiere' },
      showTitle: 'Breaking Bad',
      variant: 'screenshot',
      href: '/shows/breaking-bad/seasons/1/episodes/1',
    });
    expect(map({ ...row, type: 'season', show, season: { number: 0, ids: { trakt: 4 } } })?.item).toMatchObject({
      title: 'Specials',
      href: '/shows/breaking-bad/seasons/0',
      seasonOf: { show: 2, number: 0 },
    });
  });

  it('should support shows, people and API image arrays and objects', () => {
    expect(map({ ...row, movie: { ...movie, images: { poster: ['media.trakt.tv/posters/thumb/1.jpg'] } } })?.item.image)
      .toBe('https://media.trakt.tv/posters/thumb/1.jpg');
    expect(map({ ...row, type: 'show', show: movie })?.item.href).toBe('/shows/fight-club-1999');
    expect(
      map({
        ...row,
        type: 'person',
        person: {
          name: 'Brad Pitt',
          ids: { trakt: 4 },
          images: { headshot: { thumb: 'https://media.trakt.tv/headshots/thumb/4.jpg' } },
        },
      })?.item,
    ).toMatchObject({ title: 'Brad Pitt', href: '/people/4', image: 'https://media.trakt.tv/headshots/thumb/4.jpg' });
  });

  it('should omit missing media and use a deleted author fallback', () => {
    expect(map({ ...row, movie: null })).toBeNull();
    expect(map({ ...row, type: 'episode', episode: { ids: { trakt: 3 } }, show: null })).toBeNull();
    expect(map({ ...row, note: { ...note, notes: null, user: null } })).toMatchObject({
      text: '',
      author: { name: 'Deleted User', href: null, vip: null },
    });
  });
});
