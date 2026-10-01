import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { workerUnauthorized } from '../../api/workerUnauthorized.ts';
import type { ViewerSettings } from '../../settings/ViewerSettings.ts';
import { toProfileUser } from '../toProfileUser.ts';
import { loadProgress } from './loadProgress.ts';
import { progressFixture } from './progressFixture.ts';

const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'America/Los_Angeles', weekStartDay: 0 } as const;
const user = { slug: 'viewer', firstName: 'Viewer', avatarUrl: '', isVip: false };
const pages = { 'X-Pagination-Page': '1', 'X-Pagination-Page-Count': '13', 'X-Pagination-Item-Count': '620' };

const seen: Request[] = [];
let status = 200;
const server = setupServer(
  http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\/progress\/(watched|collection)/, ({ request }) => {
    seen.push(request);
    if (status !== 200 && request.headers.has('authorization')) return new HttpResponse(null, { status });
    const collected = new URL(request.url).pathname.includes('/collection');
    return HttpResponse.json(collected ? progressFixture.collection : progressFixture.watched, { headers: pages });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
  status = 200;
});
afterAll(() => server.close());

const settings = (progress: Record<string, unknown>) => ({ browsing: { progress } }) as unknown as ViewerSettings;

type Options = {
  type?: string;
  sort?: string;
  query?: string;
  token?: string | null;
  isSelf?: boolean;
  viewerSettings?: ViewerSettings | null;
  cookie?: string;
  locked?: boolean;
};
const load = (
  { type, sort, query = '', token = 'token', isSelf = false, viewerSettings = null, cookie, locked = false }: Options =
    {},
) =>
  loadProgress({
    fetch: (...args) => globalThis.fetch(...args),
    locals: { token },
    params: { id: 'tester', type, sort },
    url: new URL(`https://og.trakt.tv/users/tester/progress${query}`),
    cookies: { get: (name: string) => (name === 'filter-hide-progress' ? cookie : undefined) },
    parent: () =>
      Promise.resolve({
        profile: { ...profile, isLocked: locked },
        isSelf,
        user,
        settings: viewerSettings,
        datePreferences,
      }),
    now: new Date('2026-09-30T20:00:00.000Z'),
  });
const requested = () => seen.map((request) => new URL(request.url)).map(({ pathname, search }) => pathname + search);
// The page's own read, apart from the summary strip's.
const pageRead = () => requested().find((path) => path.includes('include_seasons'));

describe('loadProgress', () => {
  it('should send a logged-out viewer to sign in and back', async () => {
    await expect(load({ token: null, query: '?page=2' })).rejects.toMatchObject({
      status: 302,
      location: '/auth/signin?redirect_to=%2Fusers%2Ftester%2Fprogress%3Fpage%3D2',
    });
  });

  it('should read the page with seasons, the filters and the token', async () => {
    const result = await load({ sort: 'completed/desc', query: '?page=2&terms=bad&hide_completed=true' });

    expect(requested().at(0)).toBe(
      '/users/tester/progress/watched/completed/asc?hide_completed=true&terms=bad&include_seasons=true&extended=full%2Cimages&page=2&limit=50',
    );
    expect(seen[0]?.headers.get('authorization')).toBe('Bearer token');
    expect(result).toMatchObject({
      type: 'watched',
      sort: { by: 'completed', how: 'desc', supported: true },
      hide: ['completed'],
      terms: 'bad',
      grid: false,
      total: 620,
      page: { type: 'paginated', current: 1, total: 13 },
    });
    expect(result.rows.map(({ title }) => title)).toEqual([
      'Breaking Bad',
      'Game of Thrones',
      'The Wire',
      'Severance',
    ]);
  });

  it('should count every page for the summary strip, with the same filters', async () => {
    const result = await load({ cookie: 'ended' });
    const totals = await result.totals;

    expect(requested().slice(1)).toEqual([
      '/users/tester/progress/watched?hide_ended=true&page=1&limit=250',
      '/users/tester/progress/watched?hide_ended=true&page=2&limit=250',
      '/users/tester/progress/watched?hide_ended=true&page=3&limit=250',
    ]);
    // The same four sample shows on each of the three pages.
    expect(totals).toMatchObject({ aired: 246, completed: 189, percent: 76 });
  });

  it('should read the Library tab from collection progress', async () => {
    const result = await load({ type: 'library' });

    expect(requested().at(0)).toMatch(/^\/users\/tester\/progress\/collection\/added\/desc\?/);
    expect(result.rows.at(0)?.plays).toBe(0);
  });

  it("should take the viewer's grid view, and your own saved sort", async () => {
    const viewerSettings = settings({
      watched: { sort: 'plays', sort_how: 'desc', grid_view: true, simple_progress: true },
    });

    const other = await load({ viewerSettings });
    await other.totals;
    expect(pageRead()).toMatch(/\/watched\/added\/desc\?.*limit=48$/);
    expect(other).toMatchObject({ grid: true, simple: true });
    expect(other.onDeck.map(({ showTitle }) => showTitle)).toEqual(['Breaking Bad', 'Game of Thrones']);

    seen.length = 0;
    const own = await load({ viewerSettings, isSelf: true });
    expect(pageRead()).toMatch(/\/watched\/plays\/asc\?/);
    expect(own.sort).toEqual({ by: 'plays', how: 'desc', supported: true });
  });

  it('should calculate up next from your own last activity only on your own profile', async () => {
    const viewerSettings = settings({ watched: { use_last_activity: true }, collected: { use_last_activity: true } });

    await (await load({ viewerSettings })).totals;
    expect(requested().every((path) => !path.includes('last_activity'))).toBe(true);

    seen.length = 0;
    await (await load({ viewerSettings, isSelf: true })).totals;
    expect(requested().length).toBeGreaterThan(1);
    expect(requested().every((path) => path.includes('last_activity=watched'))).toBe(true);

    seen.length = 0;
    await load({ type: 'library', viewerSettings, isSelf: true });
    expect(pageRead()).toContain('last_activity=collected');
  });

  it('should read again logged out when the token stopped working', async () => {
    status = 401;
    const result = await load();

    expect(seen.slice(0, 2).map((request) => request.headers.has('authorization'))).toEqual([true, false]);
    expect(result.rows).toHaveLength(4);
  });

  it('should skip every read for a private profile the viewer cannot see', async () => {
    const result = await load({ locked: true });

    expect(seen).toHaveLength(0);
    expect(result.rows).toEqual([]);
    await expect(result.totals).resolves.toBeNull();
  });

  it('should fail the page when the worker does', async () => {
    status = 500;
    await expect(load()).rejects.toMatchObject({ status: 502 });
  });

  describe('for the Dropped tab', () => {
    const [breakingBad, gameOfThrones, theWire, severance] = progressFixture.watched;
    // 300 watched shows in the sort's order: Game of Thrones 11th, on the first 250, and Severance 271st, on the second.
    const filler = (id: number) => ({ show: { ids: { trakt: id } }, progress: { aired: 10, completed: 5 } });
    const order = Array.from({ length: 300 }, (_, i) => {
      if (i === 10) return gameOfThrones;
      if (i === 270) return severance;
      return filler(i + 1);
    });
    const full: Record<string, unknown[]> = { 1: [breakingBad, gameOfThrones], 2: [theWire, severance] };
    let hiddenStatus = 200;
    let hidden = progressFixture.dropped;

    const useDropped = () =>
      server.use(
        http.get('https://apiz.trakt.tv/users/hidden/dropped', ({ request }) => {
          seen.push(request);
          if (hiddenStatus === 401) return workerUnauthorized();
          return HttpResponse.json(hidden, { headers: { 'X-Pagination-Page-Count': '1' } });
        }),
        http.get('https://apiz.trakt.tv/users/tester/progress/watched/:by/:how', ({ request }) => {
          seen.push(request);
          const search = new URL(request.url).searchParams;
          const page = Number(search.get('page'));
          const headers = { 'X-Pagination-Page': String(page), 'X-Pagination-Page-Count': '2' };
          if (search.has('include_seasons')) return HttpResponse.json(full[page], { headers });
          return HttpResponse.json(order.slice((page - 1) * 250, page * 250), { headers });
        }),
      );
    afterEach(() => {
      hiddenStatus = 200;
      hidden = progressFixture.dropped;
    });

    it('should keep only your dropped shows, in the sort, with when you dropped them', async () => {
      useDropped();
      const result = await load({ type: 'dropped', sort: 'title/asc', isSelf: true, cookie: 'ended' });

      expect(requested()).toEqual(expect.arrayContaining([
        '/users/hidden/dropped?type=show&limit=250&page=1',
        '/users/tester/progress/watched/title/asc?hide_ended=true&page=1&limit=250',
        '/users/tester/progress/watched/title/asc?hide_ended=true&page=2&limit=250',
        '/users/tester/progress/watched/title/asc?hide_ended=true&include_seasons=true&extended=full%2Cimages&page=1&limit=250',
        '/users/tester/progress/watched/title/asc?hide_ended=true&include_seasons=true&extended=full%2Cimages&page=2&limit=250',
      ]));
      expect(seen).toHaveLength(5);
      expect(seen.every((request) => request.headers.get('authorization') === 'Bearer token')).toBe(true);
      expect(result).toMatchObject({
        type: 'dropped',
        total: 2,
        page: { type: 'paginated', current: 1, total: 1 },
      });
      expect(result.rows.map(({ title, droppedOn }) => [title, droppedOn])).toEqual([
        ['Game of Thrones', 'December 1, 2025'],
        ['Severance', 'April 17, 2025'],
      ]);
      expect(result.rows.at(0)?.rewatchingSince).toBe('July 2, 2026');
      await expect(result.totals).resolves.toMatchObject({ aired: 49, completed: 39 });
    });

    it('should read no full rows for a page past the last one', async () => {
      useDropped();
      const result = await load({ type: 'dropped', isSelf: true, query: '?page=2', viewerSettings: null });

      expect(result.rows).toEqual([]);
      expect(requested().filter((path) => path.includes('include_seasons'))).toEqual([]);
      expect(result.page).toEqual({ type: 'paginated', current: 1, total: 1 });
    });

    it('should show nothing when you have not dropped anything', async () => {
      hidden = [];
      useDropped();
      const result = await load({ type: 'dropped', isSelf: true });

      expect(result.rows).toEqual([]);
      expect(result.total).toBe(0);
      expect(requested().filter((path) => path.includes('include_seasons'))).toEqual([]);
    });

    it('should render empty when the token stopped working', async () => {
      hiddenStatus = 401;
      useDropped();
      const result = await load({ type: 'dropped', isSelf: true });

      expect(result.rows).toEqual([]);
      await expect(result.totals).resolves.toBeNull();
    });

    it("should open Watched on someone else's profile, keeping the sort and filters", async () => {
      const url = new URL('https://og.trakt.tv/users/tester/progress/dropped/title/asc?terms=bad');
      await expect(
        loadProgress({
          fetch: (...args) => globalThis.fetch(...args),
          locals: { token: 'token' },
          params: { id: 'tester', type: 'dropped', sort: 'title/asc' },
          url,
          cookies: { get: () => undefined },
          parent: () => Promise.resolve({ profile, isSelf: false, user, settings: null, datePreferences }),
        }),
      ).rejects.toMatchObject({ status: 302, location: '/users/tester/progress/watched/title/asc?terms=bad' });
      expect(seen).toHaveLength(0);
    });
  });
});
