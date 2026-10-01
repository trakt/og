import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../toProfileUser.ts';
import { loadLibrary } from './loadLibrary.ts';

const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const show = { title: 'Breaking Bad', ids: { trakt: 1388, slug: 'breaking-bad' }, runtime: 47 };
const metadata = { media_type: 'dvd', resolution: null, hdr: null, audio: null, audio_channels: null, '3d': null };
const movie = {
  type: 'movie',
  collected_at: '2026-09-29T19:23:00.000Z',
  metadata,
  movie: { title: 'Fight Club', ids: { trakt: 432, slug: 'fight-club-1999' }, runtime: 139 },
  episode: null,
  show: null,
};
const pages = { 'X-Pagination-Page': '1', 'X-Pagination-Page-Count': '2', 'X-Pagination-Item-Count': '61' };
const seen: Request[] = [];
const server = setupServer(
  http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\/collection\/(media|movies)/, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([movie], { headers: pages });
  }),
  http.get('https://apiz.trakt.tv/users/tester/collection/shows', ({ request }) => {
    seen.push(request);
    const row = { last_collected_at: movie.collected_at, show, seasons: [{ number: 1, episodes: [{ number: 1 }] }] };
    return HttpResponse.json([row], { headers: pages });
  }),
  http.get(
    'https://apiz.trakt.tv/shows/1388',
    () => HttpResponse.json({ ...show, images: { poster: ['media.trakt.tv/posters/medium/bb.jpg.webp'] } }),
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

type Options = { type?: string; sort?: string; query?: string; token?: string | null; isSelf?: boolean };
const load = ({ type, sort, query = '', token = null, isSelf = false }: Options = {}, overrides = {}) =>
  loadLibrary({
    fetch,
    locals: { token },
    params: { id: 'tester', type, sort },
    url: new URL(`https://og.trakt.tv/users/tester/library${query}`),
    cookies: { get: (name: string) => (name === 'filter-fade-library' ? 'collected,bogus' : undefined) },
    parent: () => Promise.resolve({ profile: { ...profile, ...overrides }, isSelf, datePreferences }),
  });
const requested = () => seen.map((request) => new URL(request.url)).map(({ pathname, search }) => pathname + search);

describe('loadLibrary', () => {
  it('should read the sorted movies with the date range, without the token', async () => {
    const result = await load({ type: 'movies', sort: 'title/asc', query: '?start_at=2026-09-01&page=2' });
    expect(requested()).toEqual([
      '/users/tester/collection/movies?extended=full%2Cimages&page=2&limit=60&sort_by=title&sort_how=asc&start_at=2026-09-01T07%3A00%3A00.000Z',
    ]);
    expect(seen[0]?.headers.has('authorization')).toBe(false);
    expect(result).toMatchObject({
      sort: { by: 'title', how: 'asc' },
      range: { startAt: '2026-09-01T07:00:00.000Z' },
      total: 61,
      days: [],
      fadeHide: { fade: ['collected'], hide: [] },
    });
    expect(result.cards[0]?.badges).toBeUndefined();
  });

  it('should group Added Date by day on All Types and show the owner their metadata', async () => {
    const result = await load({ isSelf: true });
    expect(requested()).toEqual([
      '/users/tester/collection/media?extended=full%2Cimages&page=1&limit=60&sort_by=added&sort_how=desc',
    ]);
    expect(result.days).toHaveLength(1);
    expect(result.cards[0]?.badges).toEqual({
      video: { logo: { name: 'dvd', label: 'DVD' }, threeD: false, resolution: undefined, hdr: undefined },
    });
  });

  it('should read the Shows tab without a sort, with posters from the show summary', async () => {
    const result = await load({ type: 'shows', sort: 'title/desc' });
    expect(requested()).toEqual(['/users/tester/collection/shows?extended=full%2Cimages&page=1&limit=60']);
    expect(result.sort).toEqual({ by: 'added', how: 'desc' });
    expect(result.cards[0]).toMatchObject({
      subtitles: ['1 episode', 'Sep 29, 2026 12:23 PM'],
      image: 'https://media.trakt.tv/posters/thumb/bb.jpg.webp',
    });
  });

  it('should read a private library again with the token, and skip a locked one', async () => {
    await load({ token: 'abc' }, { isPrivate: true });
    expect(seen.map((request) => request.headers.get('authorization'))).toEqual([null, 'Bearer abc']);
    seen.length = 0;
    const locked = await load({}, { isLocked: true });
    expect(locked.cards).toEqual([]);
  });

  it('should fail on an off-contract body', async () => {
    server.use(http.get(/collection\/media/, () => HttpResponse.json([{ nope: true }])));
    await expect(load()).rejects.toMatchObject({ status: 502 });
  });
});
