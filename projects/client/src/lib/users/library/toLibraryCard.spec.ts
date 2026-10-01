import { describe, expect, it } from 'vitest';
import { toLibraryCard, toLibraryShowCard } from './toLibraryCard.ts';

const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const show = { title: 'Breaking Bad', ids: { trakt: 1388, slug: 'breaking-bad' }, runtime: 47 };
const movie = {
  collected_at: '2026-09-29T19:23:00.000Z',
  metadata: { media_type: 'bluray', resolution: 'hd_1080p', hdr: null, audio: null, audio_channels: null, '3d': null },
  movie: {
    title: 'Fight Club',
    ids: { trakt: 432, slug: 'fight-club-1999' },
    released: '1999-10-15',
    runtime: 139,
    votes: 51_327,
  },
};
const episode = {
  collected_at: '2026-09-28T22:00:00.000Z',
  metadata: null,
  show,
  episode: { ids: { trakt: 104 }, season: 1, number: 2, title: 'The Bag', first_aired: '2008-01-28T02:00:00Z' },
};
const options = { sortBy: 'added', screenshots: false, owner: true, datePreferences } as const;

describe('toLibraryCard', () => {
  it('should put the collected date under the title and carry the owner metadata', () => {
    expect(toLibraryCard(movie, options)).toMatchObject({
      key: 432,
      type: 'movie',
      href: '/movies/fight-club-1999',
      subtitles: ['Sep 29, 2026 12:23 PM'],
      watchedAt: movie.collected_at,
      runtime: 139,
      badges: { video: { logo: { name: 'bluray', label: 'Blu-ray' }, resolution: '1080p' } },
      metadataLabel: 'Blu-ray · 1080p',
    });
  });

  it("should hide the metadata from other viewers and show the sort's line", () => {
    const card = toLibraryCard(movie, { ...options, owner: false, sortBy: 'released' });
    expect(card.badges).toBeUndefined();
    expect(card.subtitles).toEqual(['Oct 15, 1999']);
    expect(toLibraryCard(movie, { ...options, sortBy: 'runtime' }).subtitles).toEqual(['2h 19m']);
    expect(toLibraryCard(movie, { ...options, sortBy: 'popularity' }).subtitles).toEqual(['51,327 votes']);
    expect(toLibraryCard(movie, { ...options, sortBy: 'title' }).subtitles).toEqual([]);
  });

  it('should lay an Episodes tab card out as a screenshot under the show', () => {
    expect(toLibraryCard(episode, { ...options, screenshots: true, sortBy: 'released' })).toMatchObject({
      type: 'episode',
      number: '1x02',
      variant: 'screenshot',
      href: '/shows/breaking-bad/seasons/1/episodes/2',
      subtitles: [{ text: 'Breaking Bad', href: '/shows/breaking-bad' }, 'Jan 27, 2008 6:00 PM'],
      runtime: 47,
    });
  });
});

describe('toLibraryShowCard', () => {
  it('should count the collected episodes and show the last collected date', () => {
    const row = {
      last_collected_at: episode.collected_at,
      show,
      seasons: [{ episodes: [{}, {}] }, { episodes: [{}] }],
    };
    expect(toLibraryShowCard(row, datePreferences)).toMatchObject({
      type: 'show',
      subtitles: ['3 episodes', 'Sep 28, 2026 3:00 PM'],
    });
  });
});
