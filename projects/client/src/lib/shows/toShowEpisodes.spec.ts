import type { EpisodeResponse, ShowResponse } from '@trakt/api';
import { describe, expect, it } from 'vitest';
import type { SeasonWithEpisodes } from './loadShow.ts';
import { sortEpisodes, toShowEpisodes, yearRange } from './toShowEpisodes.ts';

const episode = (season: number, number: number, firstAired: string | null, extra: Partial<EpisodeResponse> = {}) =>
  ({
    season,
    number,
    title: `E${number}`,
    first_aired: firstAired,
    ids: { trakt: season * 100 + number },
    ...extra,
  }) as EpisodeResponse;

const season = (number: number, episodes: EpisodeResponse[]) =>
  ({ number, ids: { trakt: 900 + number }, episodes }) as SeasonWithEpisodes;

const show = {
  title: 'Breaking Bad',
  runtime: 45,
  ids: { slug: 'breaking-bad', trakt: 1388 },
  airs: { day: 'Sunday', time: '21:00', timezone: 'America/New_York' },
} as ShowResponse;

const base = {
  show,
  seasons: [
    season(0, [episode(0, 1, null, { runtime: 5 })]),
    season(1, [
      episode(1, 1, '2008-01-21T02:00:00.000Z', { comment_count: 55, rating: 7.4, votes: 10 }),
      episode(1, 2, '2008-01-28T02:00:00.000Z', { rating: 8.1, votes: 30 }),
    ]),
    season(2, [episode(2, 1, '2009-03-09T01:00:00.000Z', { rating: 8.1, votes: 20, episode_type: 'season_premiere' })]),
  ],
  now: new Date('2010-01-01'),
  signedIn: false,
  episodeTypeTags: true,
  datePreferences: { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
} as const;

describe('toShowEpisodes', () => {
  const result = toShowEpisodes(base);

  it('should list every episode, specials first when they have no air date', () => {
    expect(result.rows.map(({ number }) => number)).toEqual(['Special 1', '1x01', '1x02', '2x01']);
    expect(result.countLabel).toBe('4 Episodes');
  });

  it('should map a row for the list', () => {
    expect(result.rows[1]).toMatchObject({
      href: '/shows/breaking-bad/seasons/1/episodes/1',
      title: 'E1',
      type: { text: 'Series Premiere', kind: 'series-premiere' },
      aired: 'January 20, 2008 9:00 PM',
      runtime: '45m',
      comments: 55,
    });
    expect(result.rows[0]).toMatchObject({ aired: undefined, runtime: '5m', type: undefined });
  });

  it('should use the viewer zone when signed in', () => {
    const signedIn = toShowEpisodes({ ...base, signedIn: true });
    expect(signedIn.rows[1]?.aired).toBe('January 21, 2008 2:00 AM');
  });

  it('should drop the type tag when the viewer hides them', () => {
    expect(toShowEpisodes({ ...base, episodeTypeTags: false }).rows[1]?.type).toBeUndefined();
  });

  it('should retain ratings for sorting while hiding future and undated card ratings by default', () => {
    const { rows } = toShowEpisodes({
      ...base,
      seasons: [season(1, [
        episode(1, 1, '2008-01-21T02:00:00Z', { rating: 8 }),
        episode(1, 2, '2030-01-21T02:00:00Z', { rating: 9 }),
        episode(1, 3, null, { rating: 7 }),
      ])],
    });
    expect(rows.find(({ episode }) => episode === 1)?.released).toBe(true);
    expect(rows.find(({ episode }) => episode === 2)).toMatchObject({ released: false, rating: 9 });
    expect(rows.find(({ episode }) => episode === 3)).toMatchObject({ released: false, rating: 7 });
  });

  it('should link the seasons newest first, then All, and point the arrows at the last and first season', () => {
    expect(result.seasonLinks.map(({ text }) => text)).toEqual(['2', '1', 'Specials', 'All']);
    expect(result.seasonLinks.at(-1)).toMatchObject({ href: '/shows/breaking-bad/seasons/all', selected: true });
    expect(result.previous?.href).toBe('/shows/breaking-bad/seasons/2');
    expect(result.next?.href).toBe('/shows/breaking-bad/seasons/0');
  });

  it('should span the air years', () => {
    expect(result.years).toBe('2008 - 2009');
  });
});

describe('yearRange', () => {
  it('should collapse one year and skip missing dates', () => {
    expect(yearRange([null, '2008-01-21T02:00:00.000Z', '2008-05-01T00:00:00.000Z'])).toBe('2008');
    expect(yearRange([null, undefined])).toBeUndefined();
  });
});

describe('sortEpisodes', () => {
  const { rows } = toShowEpisodes(base);
  const numbers = (by: Parameters<typeof sortEpisodes>[0]['by'], flipped = false) =>
    sortEpisodes({ rows, by, flipped }).map(({ number }) => number);

  it('should sort by number, specials first', () => {
    expect(numbers('number')).toEqual(['Special 1', '1x01', '1x02', '2x01']);
    expect(numbers('number', true)).toEqual(['2x01', '1x02', '1x01', 'Special 1']);
  });

  it('should sort by percentage and votes, highest first, ties in air order', () => {
    expect(numbers('percentage')).toEqual(['1x02', '2x01', '1x01', 'Special 1']);
    expect(numbers('votes')).toEqual(['1x02', '2x01', '1x01', 'Special 1']);
  });

  it.each(['watchers', 'plays', 'collected', 'lists'] as const)(
    'should sort %s by its lazy count, with air-order ties and failures last',
    (by) => {
      const stats = new Map([
        [101, { watchers: 5, plays: 5, collectors: 5, lists: 5, comments: 0, votes: 0 }],
        [102, { watchers: 5, plays: 5, collectors: 5, lists: 5, comments: 0, votes: 0 }],
        [201, { watchers: 9, plays: 9, collectors: 9, lists: 9, comments: 0, votes: 0 }],
        [1, null],
      ]);
      expect(sortEpisodes({ rows, by, flipped: false, stats }).map(({ number }) => number)).toEqual([
        '2x01',
        '1x01',
        '1x02',
        'Special 1',
      ]);
      expect(sortEpisodes({ rows, by, flipped: true, stats }).map(({ number }) => number)).toEqual([
        'Special 1',
        '1x01',
        '1x02',
        '2x01',
      ]);
    },
  );

  it('should flip air date to newest first', () => {
    expect(numbers('aired', true)).toEqual(['2x01', '1x02', '1x01', 'Special 1']);
  });
});
