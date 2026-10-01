import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { dashboardPrefs } from '../dashboard/dashboardPrefs.ts';
import { loadSettings } from './loadSettings.ts';
import { settingsFixture } from './settingsFixture.ts';
import type { ViewerSettings } from './ViewerSettings.ts';

const API = 'https://apiz.trakt.tv';
const url = new URL('https://og.trakt.tv/settings?tab=1#datetime');
const now = new Date('2026-09-30T12:00:00Z');
const parent = (settings: unknown) => () => Promise.resolve({ settings: settings as ViewerSettings | null });
// Never capture globalThis.fetch itself: a reference taken before listen() skips MSW.
const fetch: typeof globalThis.fetch = (...args) => globalThis.fetch(...args);

const source = (slug: string, name: string, cinema = false) => ({
  source: slug,
  name,
  cinema,
  color: '#e50914',
  images: { logo: `media.trakt.tv/watchnow/sources/${slug}.webp`, channel: null },
});

const requested: string[] = [];
const server = setupServer(
  http.get(
    `${API}/watchnow/countries`,
    () => HttpResponse.json([{ name: 'United Kingdom', code: 'gb' }, { name: 'United States', code: 'us' }]),
  ),
  http.get(`${API}/watchnow/sources/:country`, ({ params }) => {
    const country = String(params.country);
    requested.push(country);
    if (country === 'gb') return HttpResponse.json([{ gb: [source('bbc_iplayer', 'BBC iPlayer')] }]);
    return HttpResponse.json([{ us: [source('netflix', 'Netflix'), source('amc_theatres', 'AMC', true)] }]);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  requested.length = 0;
});
afterAll(() => server.close());

describe('loadSettings', () => {
  it('should send a logged-out visitor to sign in and back', async () => {
    await expect(loadSettings({ fetch, locals: { token: null }, parent: parent(null), url, now })).rejects
      .toMatchObject({ status: 302, location: '/auth/signin?redirect_to=%2Fsettings%3Ftab%3D1' });
  });

  it("should edit the layout's settings with the year the birthday counts back from", async () => {
    const data = await loadSettings({ fetch, locals: { token: 'token' }, parent: parent(settingsFixture), url, now });
    expect(data).toMatchObject({ expired: false, year: 2026, prefs: dashboardPrefs.defaults });
  });

  it('should seed the same per-member dashboard preferences used by the dashboard', async () => {
    const cookies = {
      get: () => JSON.stringify({ og_tester: { upcoming_poster: 'season' }, other: { hide_stats: true } }),
    };
    const result = await loadSettings({
      fetch,
      locals: { token: 'token' },
      parent: parent(settingsFixture),
      url,
      now,
      cookies,
    });
    expect(result.prefs.upcoming_poster).toBe('season');
    expect(result.prefs.hide_stats).toBe(false);
  });

  it("should read the countries and the services of the viewer's country and each favorite's", async () => {
    const { watchNow } = await loadSettings({
      fetch,
      locals: { token: 'token' },
      parent: parent(settingsFixture),
      url,
      now,
    });
    expect(requested.toSorted()).toEqual(['gb', 'us']);
    expect(watchNow.countries).toEqual([{ name: 'United Kingdom', code: 'gb' }, { name: 'United States', code: 'us' }]);
    expect([...(watchNow.sources.us?.keys() ?? [])]).toEqual(['netflix']);
    expect(watchNow.sources.gb?.get('bbc_iplayer')).toMatchObject({
      name: 'BBC iPlayer',
      logo: 'https://media.trakt.tv/watchnow/sources/bbc_iplayer.webp',
    });
  });

  it('should still render the form when the Watch Now reads fail', async () => {
    server.use(
      http.get(`${API}/watchnow/countries`, () => new HttpResponse(null, { status: 500 })),
      http.get(`${API}/watchnow/sources/:country`, () => HttpResponse.json({ not: 'a list' })),
    );
    const { watchNow } = await loadSettings({
      fetch,
      locals: { token: 'token' },
      parent: parent(settingsFixture),
      url,
      now,
    });
    expect(watchNow.countries).toEqual([]);
    expect(watchNow.sources.us?.size).toBe(0);
  });

  it('should render expired, reading nothing, when the API refused the cookie', async () => {
    const data = await loadSettings({ fetch, locals: { token: 'spent' }, parent: parent(null), url, now });
    expect(data).toMatchObject({ expired: true, year: 2026, watchNow: { countries: [], sources: {} } });
    expect(requested).toEqual([]);
  });
});
