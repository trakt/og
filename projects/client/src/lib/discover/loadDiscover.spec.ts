import { isHttpError } from '@sveltejs/kit';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadDiscover } from './loadDiscover.ts';

const SHOW = { title: 'Severance', year: 2022, ids: { trakt: 1, slug: 'severance' }, first_aired: '2022-02-18' };
const MOVIE = { title: 'Heat', year: 1995, ids: { trakt: 2, slug: 'heat-1995' }, released: '1995-12-15' };
const SUMMER = {
  title: 'Stick',
  year: 2025,
  ids: { trakt: 3, slug: 'stick' },
  first_aired: '2025-06-04T01:00:00.000Z',
  airs: { day: 'Tuesday', time: '21:00', timezone: 'America/New_York' },
  network: 'Apple TV',
};
const STATS = { watcher_count: 38_500, play_count: 73_400, collected_count: 38_700 };
const seen: Request[] = [];

const server = setupServer(
  http.get('https://apiz.trakt.tv/shows/watched/weekly', ({ request }) => {
    seen.push(request);
    return HttpResponse.json([{ ...STATS, collector_count: 12, show: SHOW }]);
  }),
  http.get('https://apiz.trakt.tv/movies/watched/weekly', ({ request }) => {
    seen.push(request);
    return HttpResponse.json([{ ...STATS, movie: MOVIE }]);
  }),
  http.get('https://apiz.trakt.tv/lists/30213988/items/show', ({ request }) => {
    seen.push(request);
    return HttpResponse.json([{ type: 'show', rank: 1, id: 7, listed_at: '2025-06-02T00:00:00.000Z', show: SUMMER }]);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const datePreferences = { order: 'mdy', hour24: false, timeZone: 'Europe/Berlin', weekStartDay: 0 } as const;

const load = (hideSidenav?: string, user: unknown = null) =>
  loadDiscover({
    fetch: globalThis.fetch,
    cookies: { get: (name) => (name === 'hide_sidenav' ? hideSidenav : undefined) },
    parent: () => Promise.resolve({ user, datePreferences }),
    now: new Date('2026-09-30T00:00:00Z'),
  });

describe('loadDiscover', () => {
  it("should ask for last week's top 10 with images and no token", async () => {
    await load();

    const weekly = seen.filter((request) => request.url.includes('/watched/weekly'));
    expect(weekly).toHaveLength(2);
    for (const request of weekly) {
      const url = new URL(request.url);
      expect(url.searchParams.get('limit')).toBe('10');
      expect(url.searchParams.get('extended')).toBe('full,images');
      expect(request.headers.get('authorization')).toBeNull();
    }
  });

  it('should map both sliders', async () => {
    const data = await load();

    expect(data.topShows.map((slide) => [slide.href, slide.stats.map(({ value }) => value)])).toEqual([
      ['/shows/severance', ['38.5k', '73.4k', '38.7k']],
    ]);
    expect(data.topMovies.map((slide) => slide.href)).toEqual(['/movies/heat-1995']);
  });

  it('should ask for every show on the Summer TV Shows list in random order, with no token', async () => {
    await load();

    const request = seen.find((request) => request.url.includes('/lists/'));
    const url = new URL(request?.url ?? '');
    expect(Object.fromEntries(url.searchParams)).toEqual({ extended: 'full,images', sort_by: 'random', limit: 'all' });
    expect(request?.headers.get('authorization')).toBeNull();
  });

  it("should show the premiere in the show's time zone when signed out, and the viewer's when signed in", async () => {
    expect((await load()).summerShows.map((slide) => slide.airs)).toEqual(['Tuesdays at 9:00 PM on Apple TV']);
    expect((await load(undefined, { username: 'sean' })).summerShows.map((slide) => slide.airs)).toEqual([
      'Wednesdays at 3:00 AM on Apple TV',
    ]);
  });

  it('should read the sidebar toggle cookie', async () => {
    expect((await load()).sidenavHidden).toBe(false);
    expect((await load('true')).sidenavHidden).toBe(true);
  });

  it.each(['movies/watched/weekly', 'lists/30213988/items/show'])(
    'should fail with a 502 when %s does',
    async (path) => {
      server.use(http.get(`https://apiz.trakt.tv/${path}`, () => new HttpResponse(null, { status: 500 })));

      const thrown = await load().then(() => null, (reason: unknown) => reason);
      expect(isHttpError(thrown) && thrown.status).toBe(502);
    },
  );
});
