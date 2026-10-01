import { describe, expect, it } from 'vitest';
import { toSeasonSummary } from './toSeasonSummary.ts';

const base: Parameters<typeof toSeasonSummary>[0] = {
  show: {
    title: 'Breaking Bad',
    ids: { trakt: 1388, slug: 'breaking-bad', imdb: 'tt0903747', tmdb: 1396, tvdb: 81189 },
    overview: 'Show overview',
    runtime: 45,
    network: 'AMC',
    country: 'us',
    languages: ['en'],
    genres: ['crime'],
    images: {
      fanart: ['media.trakt.tv/fanarts/medium/a.jpg'],
      poster: ['media.trakt.tv/posters/medium/b.jpg'],
      logo: [],
      clearart: [],
      banner: [],
      thumb: [],
    },
  },
  season: { number: 1, title: 'Season 1', ids: { trakt: 3950 }, aired_episodes: 2 },
  seasons: [0, 1, 2, 4].map((number) => ({ number, ids: { trakt: 3950 + number } })),
  episodes: [
    {
      season: 1,
      number: 2,
      title: 'Second',
      ids: { trakt: 102 },
      first_aired: '2008-01-28T02:00:00Z',
      runtime: 48,
    },
    { season: 1, number: 1, title: 'Pilot', ids: { trakt: 101 }, first_aired: '2008-01-21T02:00:00Z' },
  ],
  ratings: { rating: 8.2, votes: 1600 },
  stats: { watchers: 10, plays: 20, collectors: 2, comments: 3, lists: 4, votes: 1600 },
  people: {
    cast: [{
      person: { name: 'Actor', ids: { trakt: 1, slug: 'actor' } },
      character: 'Walter',
      characters: ['Walter'],
      episode_count: 2,
    }],
    guest_stars: [],
  },
  isVip: false,
  actorSpoilers: true,
  episodeTypeTags: true,
  earlyRatings: false,
  datePreferences: { order: 'dmy', hour24: true, timeZone: 'America/Los_Angeles', weekStartDay: 1 },
  now: new Date('2026-01-01T00:00:00Z'),
};

describe('toSeasonSummary', () => {
  it('should map season-specific ratings, facts, overview fallback and ordered episode ids', () => {
    const view = toSeasonSummary(base);
    expect(view.fullTitle).toBe('Breaking Bad: Season 1');
    expect(view.overview).toBe('Show overview');
    expect(view.rating).toEqual({ value: 8.2, votes: 1600, href: '/shows/breaking-bad/seasons/1/stats' });
    expect(view.facts.premiere).toEqual({ label: 'Premiered', date: '20 January 2008' });
    expect(view.facts.totalRuntime).toEqual({ time: '1h 33m', episodes: '2 episodes' });
    expect(view.episodeIds).toEqual([101, 102]);
    expect(view.cast.at(0)).toMatchObject({ name: 'Actor', characters: 'Walter', episodes: '2 episodes' });
    expect(view.episodes.at(0)?.aired).toBe('20 January 2008 18:00');
    expect(view.counts.map(({ label }) => label)).not.toContain('favorited');
  });

  it('should expose the season trailer to the shared player', () => {
    const video = {
      title: 'Trailer',
      url: 'https://youtube.com/watch?v=HhesaQXLuRY',
      type: 'trailer',
      site: 'youtube',
      size: 720,
      official: true,
      published_at: '2020-01-01T00:00:00Z',
      country: 'us',
      language: 'en',
    } as const;
    expect(toSeasonSummary({ ...base, videos: [video] }).trailer).toBe(video.url);
    expect(toSeasonSummary(base).trailer).toBeUndefined();
  });

  it('should link the subnav newest first and only navigate to consecutive seasons', () => {
    const view = toSeasonSummary(base);
    expect(view.seasonLinks.map(({ text }) => text)).toEqual(['4', '2', '1', 'Specials', 'All']);
    expect(view.seasonLinks.find(({ selected }) => selected)?.text).toBe('1');
    expect(view.previous?.href).toBe('/shows/breaking-bad/seasons/0');
    expect(view.next?.href).toBe('/shows/breaking-bad/seasons/2');
    expect(toSeasonSummary({ ...base, season: { ...base.season, number: 2 } }).next).toBeUndefined();
  });

  it('should use custom titles and specials, season overview and poster fallbacks', () => {
    const view = toSeasonSummary({
      ...base,
      season: { ...base.season, number: 0, title: null, overview: 'Special overview' },
    });
    expect(view.title).toBe('Specials');
    expect(view.previous).toBeUndefined();
    expect(view.overview).toBe('Special overview');
    expect(view.poster).toContain('/posters/medium/b.jpg');
    const custom = toSeasonSummary({ ...base, season: { ...base.season, title: 'The Beginning' } });
    expect(custom.title).toBe('The Beginning');
    expect(custom.parentTitle).toBe('Breaking Bad: Season 1');
  });

  it('should honor actor spoilers, episode tags, VIP fact links and native runtime totals', () => {
    const view = toSeasonSummary({
      ...base,
      actorSpoilers: false,
      episodeTypeTags: false,
      isVip: true,
      season: { ...base.season, total_runtime: 120 },
    });
    expect(view.cast.at(0)?.episodes).toBe('');
    expect(view.episodes.at(0)?.type).toBeUndefined();
    expect(view.facts.country?.href).toBe('/shows/popular?countries=us');
    expect(view.facts.totalRuntime?.time).toBe('2h');
    expect(view.links.map(({ label }) => label)).not.toContain('Official Site');
  });

  it('should omit unaired ratings and exclude future episodes from runtime and history', () => {
    const future = {
      ...base,
      episodes: [{
        ...base.episodes.at(0),
        season: 1,
        number: 1,
        ids: { trakt: 99 },
        first_aired: '2027-01-01T02:00:00Z',
      }],
      season: { ...base.season, aired_episodes: 0 },
    };
    const view = toSeasonSummary(future);
    expect(view.rating).toBeUndefined();
    expect(view.facts.premiere?.label).toBe('Premieres');
    expect(view.episodeIds).toEqual([]);
    expect(view.facts.totalRuntime).toBeUndefined();
    expect(toSeasonSummary({ ...future, earlyRatings: true }).rating?.value).toBe(8.2);
  });
});
