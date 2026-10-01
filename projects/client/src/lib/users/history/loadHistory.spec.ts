import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../toProfileUser.ts';
import { loadHistory } from './loadHistory.ts';

const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const show = { title: 'Breaking Bad', ids: { trakt: 1388, slug: 'breaking-bad' }, runtime: 47 };
const play = {
  id: 9,
  watched_at: '2026-09-29T16:23:00.000Z',
  show,
  episode: { ids: { trakt: 104 }, season: 2, number: 4, title: 'Number the Stars' },
};
const pages = { 'X-Pagination-Page': '1', 'X-Pagination-Page-Count': '2', 'X-Pagination-Item-Count': '61' };
const seen: Request[] = [];
const server = setupServer(
  http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\/history/, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([play], { headers: pages });
  }),
  http.get('https://apiz.trakt.tv/users/tester/watched/shows', ({ request }) => {
    seen.push(request);
    return HttpResponse.json([{ plays: 3, last_watched_at: play.watched_at, show }], { headers: pages });
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

type Options = { type?: string; sort?: string; query?: string; token?: string | null; signedIn?: boolean };
const load = ({ type, sort, query = '', token = null, signedIn = true }: Options = {}, overrides = {}) =>
  loadHistory({
    fetch,
    locals: { token },
    params: { id: 'tester', type, sort },
    url: new URL(`https://og.trakt.tv/users/tester/history${type ? `/${type}` : ''}${query}`),
    cookies: { get: (name: string) => (name === 'filter-fade-history' ? 'watched,bogus' : undefined) },
    parent: () =>
      Promise.resolve({
        profile: { ...profile, ...overrides },
        stats: null,
        user: signedIn ? { slug: 'viewer' } : null,
        datePreferences,
      }),
  });
const requested = () => seen.map((request) => new URL(request.url)).map(({ pathname, search }) => pathname + search);

describe('loadHistory', () => {
  it('should read one item with its filters, without the token, and name the item', async () => {
    const result = await load({ type: 'episodes', query: '?season=333403&start_at=2026-09-01&genres=drama' });
    expect(requested()).toEqual([
      '/users/tester/history/seasons/333403?extended=full%2Cimages&page=1&limit=60&start_at=2026-09-01T07%3A00%3A00.000Z&genres=drama',
    ]);
    expect(seen[0]?.headers.has('authorization')).toBe(false);
    expect(result).toMatchObject({
      itemTitle: 'Breaking Bad Season 2',
      screenshots: true,
      counts: { plays: 61 },
      fadeHide: { fade: ['watched'], hide: [] },
      dividers: true,
      page: { current: 1, total: 2 },
    });
    expect(result.days[0]?.cards[0]).toMatchObject({ variant: 'screenshot', show: { text: 'Breaking Bad' } });
  });

  it('should page the watched list on the Shows tab, with each poster from the show summary', async () => {
    const result = await load({ type: 'shows' });
    expect(requested()).toEqual(['/users/tester/watched/shows?extended=full%2Cimages&page=1&limit=60']);
    expect(result.counts).toEqual({ unique: { count: 61, noun: 'show' } });
    expect(result.days[0]?.cards[0]).toMatchObject({
      type: 'show',
      image: 'https://media.trakt.tv/posters/thumb/bb.jpg.webp',
    });
  });

  it('should group the filtered plays by show on a filtered Shows tab', async () => {
    const result = await load({ type: 'shows', query: '?genres=drama' });
    expect(requested()).toEqual([
      '/users/tester/history/shows?extended=full%2Cimages&page=1&limit=250&genres=drama',
      '/users/tester/history/shows?extended=full%2Cimages&page=2&limit=250&genres=drama',
    ]);
    expect(result.counts).toEqual({ unique: { count: 1, noun: 'show' } });
    expect(result.page).toEqual({ type: 'paginated', current: 1, total: 1 });
  });

  it('should drop OG sort segments', async () => {
    await expect(load({ type: 'movies', sort: 'plays/asc', query: '?genres=drama' })).rejects.toMatchObject({
      status: 302,
      location: '/users/tester/history/movies?genres=drama',
    });
  });

  it('should send signed-out visitors past page 1 to sign in', async () => {
    await expect(load({ query: '?page=2', signedIn: false })).rejects.toMatchObject({
      status: 302,
      location: '/auth/signin?redirect_to=%2Fusers%2Ftester%2Fhistory%3Fpage%3D2',
    });
  });

  it('should read a private profile again with the token, and show only the frame when locked', async () => {
    await load({ token: 'viewer-token' }, { isPrivate: true });
    expect(seen.map((request) => request.headers.get('authorization'))).toEqual([null, 'Bearer viewer-token']);
    expect((await load({}, { isLocked: true })).days).toEqual([]);
  });

  it('should report missing items and bad responses', async () => {
    server.use(http.get(/history/, () => new HttpResponse(null, { status: 404 })));
    await expect(load({ query: '?movie=1' })).rejects.toMatchObject({ status: 404 });
    server.use(http.get(/history/, () => HttpResponse.json([{ id: 1 }])));
    await expect(load()).rejects.toMatchObject({ status: 502 });
  });
});
