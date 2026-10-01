import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { workerUnauthorized } from '../api/workerUnauthorized.ts';
import { loadDashboard } from './loadDashboard.ts';

const API = 'https://apiz.trakt.tv';
const profile = {
  username: 'tester',
  private: false,
  name: 'OG Tester',
  vip: true,
  ids: { slug: 'tester' },
  joined_at: '2020-08-20T19:23:00Z',
};
const datePreferences = { order: 'mdy', timeZone: 'America/Los_Angeles', hour24: false, weekStartDay: 0 } as const;
const seen: Request[] = [];
const server = setupServer(
  http.get(`${API}/users/me`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json(profile, { headers: { 'X-Runtime': '0.1' } });
  }),
  http.get(
    `${API}/users/me/stats`,
    () =>
      HttpResponse.json({
        shows: { watched: 5, collected: 2 },
        movies: { watched: 7, collected: 6, plays: 13, minutes: 1971 },
        episodes: { watched: 50, plays: 50, collected: 0, minutes: 3000 },
      }),
  ),
  http.get(`${API}/users/me/watching`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API}/users/requests`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([{
      id: 1,
      requested_at: '2026-09-29T22:00:00Z',
      user: { ...profile, name: 'Toby Gerlach' },
    }]);
  }),
  http.get(`${API}/*`, () => HttpResponse.json([])),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const load = (token: string | null = 'token', cookies: Record<string, string> = {}, settings: unknown = null) =>
  loadDashboard({
    fetch,
    locals: { token },
    cookies: { get: (key) => cookies[key] },
    parent: () =>
      Promise.resolve({
        user: { slug: 'tester', firstName: 'OG', avatarUrl: 'avatar', isVip: true },
        settings: settings as never,
        datePreferences,
      }),
    now: new Date('2026-09-30T12:00:00Z'),
  });

// Every streamed panel, settled so none of its requests runs on into the next test.
const panels = (data: Awaited<ReturnType<typeof load>>) =>
  [
    data.upNext,
    data.schedule,
    data.watchlist,
    data.lastThirtyDays,
    data.recentlyWatched,
    data.socialFeed,
    data.recommendations,
  ].map((panel) => panel?.catch(() => null));

describe('loadDashboard', () => {
  it('should authenticate viewer reads and map greeting and request dates with layout preferences', async () => {
    const data = await load();
    await Promise.all(panels(data));
    expect(data.profile.firstName).toBe('OG');
    expect(data.memberSince).toBe('Aug 20, 2020 12:23 PM');
    expect(data.requests.at(0)).toMatchObject({ id: 1, name: 'Toby Gerlach', requestedAt: 'Sep 29, 2026 3:00 PM' });
    expect(data.watching).toBeNull();
    expect(seen.every((request) => request.headers.get('authorization') === 'Bearer token')).toBe(true);
  });

  it('should redirect logged-out and expired sessions to the placeholder without server refresh', async () => {
    await expect(load(null)).rejects.toMatchObject({ status: 302, location: '/' });
    expect(seen).toHaveLength(0);
    server.use(http.get(`${API}/users/me/stats`, () => new HttpResponse(null, { status: 401 })));
    await expect(load()).rejects.toMatchObject({ status: 302, location: '/' });
  });

  it("should redirect, not throw, on the worker's plain-text 401 for every frame read", async () => {
    server.use(
      ...['/users/me', '/users/me/stats', '/users/me/watching', '/users/requests'].map((path) =>
        http.get(`${API}${path}`, () => workerUnauthorized())
      ),
    );
    await expect(load()).rejects.toMatchObject({ status: 302, location: '/' });
  });

  it('should reject unavailable or malformed inbox data rather than show a false empty inbox', async () => {
    server.use(http.get(`${API}/users/requests`, () => new HttpResponse(null, { status: 503 })));
    await expect(load()).rejects.toMatchObject({ status: 502 });
    server.use(
      http.get(`${API}/users/requests`, () => HttpResponse.json([{ id: 'bad', requested_at: 'today', user: {} }])),
    );
    await expect(load()).rejects.toMatchObject({ status: 502 });
  });

  it('should honor browser dismissals and leave an empty inbox empty', async () => {
    server.use(
      http.get(`${API}/users/me`, () => HttpResponse.json({ ...profile, joined_at: '2026-09-29T12:00:00Z' })),
      http.get(`${API}/users/requests`, () => HttpResponse.json([])),
    );
    const data = await load('token', { 'og-dashboard-welcome-hidden': '1' });
    await Promise.all(panels(data));
    expect(data.notices.welcome).toBe(false);
    expect(data.requests).toEqual([]);
  });

  it('should leave out the panels the viewer hid, and not fetch them', async () => {
    const paths: string[] = [];
    const record = ({ request }: { request: Request }) => paths.push(new URL(request.url).pathname);
    server.events.on('request:start', record);
    const prefs = { tester: { hide_list: true, hide_network: true, hide_recommendations: true } };
    const data = await load('token', { 'og-dashboard': JSON.stringify(prefs) }, { user: { vip: true } });

    expect(data.watchlist).toBeNull();
    expect(data.socialFeed).toBeNull();
    expect(data.recommendations).toBeNull();
    expect(data.upNext).not.toBeNull();
    await Promise.all(panels(data));
    server.events.removeListener('request:start', record);
    expect(paths).toContain('/sync/progress/up_next');
    expect(paths.some((path) => path.includes('/watchlist') || path.startsWith('/recommendations'))).toBe(false);
    expect(paths.some((path) => path.includes('/following/activities'))).toBe(false);
  });

  it("should load the panels in the viewer's settings", async () => {
    const upNext: URL[] = [];
    server.use(http.get(`${API}/sync/progress/up_next`, ({ request }) => {
      upNext.push(new URL(request.url));
      return HttpResponse.json([]);
    }));
    const settings = {
      browsing: { progress: { on_deck: { sort: 'title', sort_how: 'desc', simple_progress: true } } },
    };

    const data = await load('token', {}, settings);
    await Promise.all(panels(data));

    expect(data.dashboard.upNext.sort).toEqual({ by: 'title', how: 'desc', title: 'Title' });
    expect(upNext.at(0)?.searchParams.get('sort_by')).toBe('title');
    expect(upNext.at(0)?.searchParams.get('sort_how')).toBe('desc');
  });
});
