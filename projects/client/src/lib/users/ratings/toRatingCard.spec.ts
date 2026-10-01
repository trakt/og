import { describe, expect, it } from 'vitest';
import { ratingRowsSchema } from './ratingRowsSchema.ts';
import { toRatingCard } from './toRatingCard.ts';
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const opts = { type: 'all', by: 'added', datePreferences } as const;
const base = { rating: 9, rated_at: '2026-09-29T22:00:00Z' };
const movie = {
  title: 'Fight Club',
  ids: { trakt: 1, slug: 'fight-club' },
  runtime: 139,
  released: '1999-10-15',
  votes: 10,
  images: { poster: ['media.trakt.tv/posters/medium/f.jpg'] },
};
const show = {
  title: 'Breaking Bad',
  ids: { trakt: 2, slug: 'breaking-bad' },
  images: { poster: ['media.trakt.tv/posters/medium/b.jpg'] },
};
const episode = {
  ids: { trakt: 1 },
  title: 'Pilot',
  season: 1,
  number: 1,
  images: { screenshot: ['media.trakt.tv/screenshots/medium/p.jpg'] },
};
const map = (raw: unknown, options = opts) =>
  ratingRowsSchema.parse([raw]).map((row) => toRatingCard(row, options)).at(0);
describe('toRatingCard', () => {
  it('should keep the profile rating separate and format the rated date in the viewer zone', () => {
    expect(map({ ...base, type: 'movie', movie })).toMatchObject({
      key: 'movie-1',
      ownerRating: 9,
      subtitles: ['Sep 29, 2026 3:00 PM'],
      href: '/movies/fight-club',
      image: 'https://media.trakt.tv/posters/thumb/f.jpg',
    });
  });
  it('should use episode stills only on Episodes, with the show line and summary premiere badge', () => {
    const row = ratingRowsSchema.parse([{ ...base, type: 'episode', episode, show }]).at(0);
    if (!row) throw new Error('fixture missing');
    expect(toRatingCard(row, { ...opts, type: 'episodes' })).toMatchObject({
      key: 'episode-1',
      seasonOf: { show: 2, number: 1, episode: 1 },
      variant: 'screenshot',
      number: '1x01',
      href: '/shows/breaking-bad/seasons/1/episodes/1',
      image: 'https://media.trakt.tv/screenshots/thumb/p.jpg',
      subtitles: [{ text: 'Breaking Bad', href: '/shows/breaking-bad' }, 'Sep 29, 2026 3:00 PM'],
      episodeBadge: { label: 'Series Premiere' },
    });
    expect(toRatingCard(row, opts)?.image).toBe('https://media.trakt.tv/posters/thumb/b.jpg');
  });
  it('should support specials, season-specific posters and released/runtime/votes lines', () => {
    const rows = ratingRowsSchema.parse([{
      ...base,
      type: 'season',
      season: { ids: { trakt: 3 }, number: 0, images: { poster: ['media.trakt.tv/posters/medium/s.jpg'] } },
      show,
    }, { ...base, type: 'movie', movie }]);
    const season = rows.at(0);
    const film = rows.at(1);
    if (!season || !film) throw new Error('fixture missing');
    expect(toRatingCard(season, opts)).toMatchObject({
      title: 'Specials',
      href: '/shows/breaking-bad/seasons/0',
      image: 'https://media.trakt.tv/posters/thumb/s.jpg',
    });
    expect(toRatingCard(film, { ...opts, by: 'released' })?.subtitles).toEqual(['Oct 15, 1999']);
    expect(toRatingCard(film, { ...opts, by: 'runtime' })?.subtitles).toEqual(['139 minutes']);
    expect(toRatingCard(film, { ...opts, by: 'votes' })?.subtitles).toEqual(['10 votes']);
  });
  it('should skip deleted media and reject malformed bodies', () => {
    expect(map({ ...base, type: 'movie', movie: null })).toBeNull();
    expect(map({ ...base, type: 'episode', episode, show: null })).toBeNull();
    expect(ratingRowsSchema.safeParse([{ ...base, rating: 11, type: 'movie', movie }]).success).toBe(false);
  });
});
