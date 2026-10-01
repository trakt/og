import { describe, expect, it } from 'vitest';
import { loadShowData } from './loadShow.ts';

const season = {
  number: 1,
  ids: { trakt: 11 },
  aired_episodes: 1,
  episode_count: 1,
  episodes: [{ season: 1, number: 1, title: 'Pilot', ids: { trakt: 101 }, first_aired: '2008-01-01T00:00:00Z' }],
};
const people = {
  cast: [],
  guest_stars: [{
    person: { name: 'Guest', ids: { trakt: 9, slug: 'guest' } },
    character: 'Self',
    characters: ['Self'],
  }],
};

function params(seasons: unknown, cast: unknown = people) {
  const fetcher: typeof fetch = (input, init) => {
    const request = new Request(input, init);
    const path = new URL(request.url).pathname;
    const body = path === '/shows/breaking-bad'
      ? { title: 'Breaking Bad', year: 2008, ids: { trakt: 1388, slug: 'breaking-bad' } }
      : path.endsWith('/seasons')
      ? seasons
      : path.endsWith('/people')
      ? cast
      : null;
    return Promise.resolve(Response.json(body, { status: body === null ? 503 : 200 }));
  };
  return {
    fetch: fetcher,
    token: null,
    id: 'breaking-bad',
    parent: () =>
      Promise.resolve({
        user: null,
        settings: null,
        datePreferences: { order: 'mdy' as const, hour24: false, timeZone: 'UTC', weekStartDay: 0 as const },
      }),
  };
}

describe('loadShowData', () => {
  it('should validate and retain extended episodes and guest stars', async () => {
    const data = await loadShowData(params([season]));
    expect(data.seasons.at(0)?.episodes?.at(0)?.ids.trakt).toBe(101);
    expect(data.summary.guestStars.at(0)?.name).toBe('Guest');
  });
  it('should discard invalid optional extended bodies instead of trusting their shapes', async () => {
    const data = await loadShowData(
      params([{ ...season, episodes: [{ ids: { trakt: 'bad' } }] }], { guest_stars: 'bad' }),
    );
    expect(data.seasons).toEqual([]);
    expect(data.summary.guestStars).toEqual([]);
  });
});
