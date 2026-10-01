import type { EpisodeResponse, ShowResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import type { SeasonWithEpisodes } from './loadShow.ts';
import { airsAt, type SeasonCard, sortSeasons, toShowSummary } from './toShowSummary.ts';

const episode = (season: number, number: number, firstAired: string | null, trakt = season * 100 + number) =>
  ({ season, number, title: `E${number}`, first_aired: firstAired, ids: { trakt } }) as EpisodeResponse;

const season = (number: number, episodes: EpisodeResponse[], extra: Partial<SeasonWithEpisodes> = {}) =>
  ({ number, ids: { trakt: 900 + number }, episode_count: episodes.length, episodes, ...extra }) as SeasonWithEpisodes;

const show = (extra: Partial<ShowResponse> = {}) =>
  ({
    title: 'Breaking Bad',
    year: 2008,
    ids: { slug: 'breaking-bad', trakt: 1388, tvdb: 81189, tmdb: 1396 },
    first_aired: '2008-01-21T02:00:00.000Z',
    airs: { day: 'Sunday', time: '21:00', timezone: 'America/New_York' },
    ...extra,
  }) as ShowResponse;

const base = {
  show: show({ status: 'ended', last_aired: '2013-09-30T01:00:00.000Z', network: 'AMC' }),
  ratings: null,
  stats: null,
  people: null,
  studios: [],
  seasons: [],
  progress: null,
  signedIn: false,
  rank: null,
  country: 'us',
  otherSiteRatings: true,
  earlyRatings: false,
  actorSpoilers: true,
  episodeTypeTags: true,
  isVip: false,
  datePreferences: { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
  now: new Date('2026-09-29T12:00:00Z'),
} as const;

describe('airsAt', () => {
  it('should find the next slot in the show zone, daylight saving included', () => {
    // Tuesday Sep 29 2026; the next Sunday 21:00 in New York (EDT) is Oct 5 01:00 UTC.
    expect(airsAt(base.show.airs, base.now)).toBe('2026-10-05T01:00:00.000Z');
  });

  it('should give up without a day, time or zone', () => {
    expect(airsAt({ day: 'Sunday', time: null, timezone: 'America/New_York' }, base.now)).toBeUndefined();
    expect(airsAt(null, base.now)).toBeUndefined();
  });
});

describe('toShowSummary', () => {
  it('should order history ticks by broadcast order and omit specials, unaired and undated episodes', () => {
    const summary = toShowSummary({
      ...base,
      seasons: [
        season(2, [episode(2, 1, '2026-09-01T01:00Z')]),
        season(0, [episode(0, 1, '2026-09-01T01:00Z')]),
        season(1, [
          episode(1, 3, null),
          episode(1, 4, '2027-01-01T01:00Z'),
          episode(1, 2, '2026-09-01T01:00Z'),
          episode(1, 1, '2026-09-01T01:00Z'),
        ]),
      ],
    });
    expect(summary.episodeIds).toEqual([101, 102, 201]);
  });
  describe('facts', () => {
    it('should say an ended show ended on its last air date, in the show zone when logged out', () => {
      const { facts } = toShowSummary(base);

      expect(facts.status).toEqual({ label: 'Ended', value: 'September 29, 2013' });
      expect(facts.network?.name).toBe('AMC');
      expect(facts.airs).toBeUndefined();
      expect(facts.premiered).toBe('January 20, 2008');
    });

    it('should give an airing show its weekly slot in the viewer zone', () => {
      const { facts } = toShowSummary({
        ...base,
        show: show({ status: 'returning series', network: 'AMC' }),
        signedIn: true,
        datePreferences: { ...base.datePreferences, timeZone: 'Europe/London' },
      });

      expect(facts.airs).toEqual({ when: 'Monday at 2:00 AM', network: { name: 'AMC', href: undefined } });
      expect(facts.status).toBeUndefined();
      expect(facts.network).toBeUndefined();
    });

    it('should give an upcoming show its status and premiere', () => {
      const { facts } = toShowSummary({
        ...base,
        show: show({ status: 'in production', first_aired: '2027-01-10T02:00:00.000Z' }),
      });

      expect(facts.status).toEqual({ label: 'Status', value: 'In Production' });
      expect(facts.premieres?.date).toBe('January 9, 2027');
      expect(facts.premiered).toBeUndefined();
    });
  });

  describe('recent episodes', () => {
    const seasons = [
      season(0, [episode(0, 1, '2013-01-01T00:00:00Z')]),
      season(1, [
        episode(1, 1, '2026-09-01T00:00:00Z'),
        episode(1, 2, '2026-09-08T00:00:00Z'),
        episode(1, 3, '2026-09-15T00:00:00Z'),
        episode(1, 4, '2026-09-22T00:00:00Z'),
        episode(1, 5, '2026-10-06T00:00:00Z'),
        episode(1, 6, null),
      ]),
    ];

    it('should show the next to air and the two latest aired, skipping specials, when logged out', () => {
      const { recent } = toShowSummary({ ...base, seasons });

      expect(recent.upNext).toBe(false);
      expect(recent.next?.number).toBe('1x05');
      expect(recent.aired.map(({ number }) => number)).toEqual(['1x04', '1x03']);
    });

    it('should put the next to watch first and leave it out of Recently Aired', () => {
      const { recent } = toShowSummary({ ...base, seasons, progress: { next: episode(1, 3, null) } });

      expect(recent.upNext).toBe(true);
      expect(recent.next?.number).toBe('1x03');
      expect(recent.aired.map(({ number }) => number)).toEqual(['1x04', '1x02']);
    });

    it('should show three aired episodes when nothing is next', () => {
      const { recent } = toShowSummary({ ...base, seasons: [season(1, seasons[1]!.episodes!.slice(0, 4))] });

      expect(recent.next).toBeUndefined();
      expect(recent.aired).toHaveLength(3);
    });

    it('should tag the premiere unless the viewer hides episode types', () => {
      const tags = (episodeTypeTags: boolean) =>
        toShowSummary({ ...base, episodeTypeTags, seasons: [season(1, [episode(1, 1, '2026-09-01T01:00:00Z')])] })
          .recent.aired[0]?.tags?.map(({ text }) => text);

      expect(tags(true)).toEqual(['Series Premiere', 'Aug 31, 2026 9:00 PM']);
      expect(tags(false)).toEqual(['Aug 31, 2026 9:00 PM']);
    });
  });

  it('should count seasons without the specials', () => {
    const summary = toShowSummary({ ...base, seasons: [season(0, []), season(1, []), season(2, [])] });

    expect(summary.seasonCount).toBe(2);
    expect(summary.seasons.map(({ title }) => title)).toEqual(['Specials', 'Season 1', 'Season 2']);
  });

  it('should hide actor episode counts for viewers who hide actor spoilers', () => {
    const member = {
      characters: ['Walter White'],
      episode_count: 62,
      person: { name: 'Bryan Cranston', ids: { slug: 'bc' } },
    };
    const people = { cast: [member], guest_stars: [{ ...member, episode_count: 1 }] } as never;

    expect(toShowSummary({ ...base, people }).cast[0]?.episodes).toBe('62 episodes');
    expect(toShowSummary({ ...base, people }).guestStars[0]?.episodes).toBe('1 episode');
    expect(toShowSummary({ ...base, people, actorSpoilers: false }).cast[0]?.episodes).toBe('');
  });

  it('should link TVDB and Fanart.tv by TVDB id', () => {
    const labels = toShowSummary(base).links.map(({ label, href }) => `${label} ${href}`);

    expect(labels).toContain('TVDB https://www.thetvdb.com/dereferrer/series/81189');
    expect(labels).toContain('Fanart.tv https://fanart.tv/series/81189');
    expect(labels).toContain('TMDB https://www.themoviedb.org/tv/1396');
  });
});

describe('sortSeasons', () => {
  const card = (number: number, rating: number, votes: number) => ({ id: number, number, rating, votes }) as SeasonCard;
  const cards = [card(1, 8.2, 10), card(2, 9.05, 30), card(3, 9.01, 20)];
  const numbers = (sorted: SeasonCard[]) => sorted.map(({ number }) => number);

  it('should put the newest season first, and flip on the toggle', () => {
    expect(numbers(sortSeasons({ cards, by: 'number', flipped: false }))).toEqual([3, 2, 1]);
    expect(numbers(sortSeasons({ cards, by: 'number', flipped: true }))).toEqual([1, 2, 3]);
  });

  it.each(['watchers', 'plays', 'collected', 'lists'] as const)(
    'should sort %s descending, reverse direction and keep failed counts at zero',
    (by) => {
      const stats = new Map([
        [1, { watchers: 1, plays: 1, collectors: 1, lists: 1, comments: 0, votes: 0 }],
        [2, { watchers: 9, plays: 9, collectors: 9, lists: 9, comments: 0, votes: 0 }],
        [3, null],
      ]);
      expect(numbers(sortSeasons({ cards, by, flipped: false, stats }))).toEqual([2, 1, 3]);
      expect(numbers(sortSeasons({ cards, by, flipped: true, stats }))).toEqual([3, 1, 2]);
    },
  );

  it('should sort on the integer percentage, ties in season order', () => {
    expect(numbers(sortSeasons({ cards, by: 'percentage', flipped: false }))).toEqual([2, 3, 1]);
    expect(numbers(sortSeasons({ cards, by: 'votes', flipped: false }))).toEqual([2, 3, 1]);
  });
});
