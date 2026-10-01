import { isRedirect } from '@sveltejs/kit';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { ViewerSettings } from '../settings/ViewerSettings.ts';
import { loadChart } from './loadChart.ts';

const SHOW = { title: 'Severance', year: 2022, ids: { trakt: 1, slug: 'severance' }, first_aired: '2022-02-18' };
const seen: Request[] = [];
const server = setupServer(
  http.get('https://apiz.trakt.tv/shows/recommendations', ({ request }) => {
    seen.push(request);
    return HttpResponse.json([{ show: SHOW, score: 1, sources: [] }], {
      headers: { 'X-Pagination-Page': '1', 'X-Pagination-Page-Count': '3' },
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const recommendations = (token: string | null) =>
  loadChart({
    fetch: globalThis.fetch,
    token,
    cookies: { get: () => undefined },
    parent: () => Promise.resolve({ datePreferences: { order: 'mdy' }, settings: null }),
    url: new URL('https://og.test/shows/recommendations?page=2'),
    type: 'shows',
    chart: 'recommendations',
  });

const redirectOf = (promise: Promise<unknown>) =>
  promise.then(() => null, (thrown: unknown) => (isRedirect(thrown) ? thrown.location : thrown));

describe('loadChart recommendations', () => {
  it('should ask for 38 with the token and ignore paging, like OG', async () => {
    const data = await recommendations('fake-token');

    const request = seen.at(0);
    expect(request?.headers.get('authorization')).toBe('Bearer fake-token');
    expect(new URL(request?.url ?? '').searchParams.get('limit')).toBe('38');
    expect(data.cards.map((card) => [card.href, card.tags])).toEqual([['/shows/severance', []]]);
    expect(data.page).toEqual({ type: 'infinite', current: 1 });
  });

  it("should send only the filters OG's recommendations offered", async () => {
    await loadChart({
      fetch: globalThis.fetch,
      token: 'fake-token',
      cookies: { get: () => undefined },
      parent: () => Promise.resolve({ datePreferences: { order: 'mdy' }, settings: null }),
      url: new URL('https://og.test/shows/recommendations?genres=drama&certifications=tv-ma&ratings=70-100'),
      type: 'shows',
      chart: 'recommendations',
    });

    const query = new URL(seen.at(0)?.url ?? '').searchParams;
    expect(query.get('genres')).toBe('drama');
    expect(query.get('ratings')).toBe('70-100');
    expect(query.has('certifications')).toBe(false);
  });

  it('should send a signed-out viewer to sign in without calling the API', async () => {
    expect(await redirectOf(recommendations(null))).toBe('/auth/signin?redirect_to=%2Fshows%2Frecommendations');
    expect(seen).toHaveLength(0);
  });

  it('should send a viewer whose token stopped working to sign in', async () => {
    server.use(http.get('https://apiz.trakt.tv/shows/recommendations', () => new HttpResponse(null, { status: 401 })));
    expect(await redirectOf(recommendations('stale'))).toBe('/auth/signin?redirect_to=%2Fshows%2Frecommendations');
  });
});

describe('loadChart hide menu', () => {
  const trending = (token: string | null, hide?: string) =>
    loadChart({
      fetch: globalThis.fetch,
      token,
      cookies: { get: (name) => (name === 'filter-hide-shows' ? hide : undefined) },
      parent: () => Promise.resolve({ datePreferences: { order: 'mdy' }, settings: null }),
      url: new URL('https://og.test/shows/trending'),
      type: 'shows',
      chart: 'trending',
    });
  const respond = (request: Request) => {
    seen.push(request);
    return request.headers.get('authorization') === 'Bearer stale'
      ? new HttpResponse(null, { status: 401 })
      : HttpResponse.json([{ watchers: 3, show: SHOW }]);
  };

  it('should ask the API to drop watched and watchlisted items with the token', async () => {
    server.use(http.get('https://apiz.trakt.tv/shows/trending', ({ request }) => respond(request)));
    const data = await trending('fake-token', 'watched,watchlisted,rated');

    const request = seen.at(0);
    expect(request?.headers.get('authorization')).toBe('Bearer fake-token');
    expect(new URL(request?.url ?? '').searchParams.get('ignore_watched')).toBe('true');
    expect(new URL(request?.url ?? '').searchParams.get('ignore_watchlisted')).toBe('true');
    expect(data.fadeHide).toEqual({ fade: [], hide: ['watched', 'watchlisted', 'rated'] });
  });

  it('should keep the public request when the API has nothing to drop', async () => {
    server.use(http.get('https://apiz.trakt.tv/shows/trending', ({ request }) => respond(request)));
    await trending('fake-token', 'rated');

    expect(seen.at(0)?.headers.get('authorization')).toBeNull();
  });

  it('should fall back to the public chart when the token stopped working', async () => {
    server.use(http.get('https://apiz.trakt.tv/shows/trending', ({ request }) => respond(request)));
    const data = await trending('stale', 'watched');

    expect(seen.map((request) => request.headers.get('authorization'))).toEqual(['Bearer stale', null]);
    expect(data.cards).toHaveLength(1);
  });
});

describe('loadChart advanced filters', () => {
  const settings = { browsing: { watchnow: { country: 'GB', favorites: ['gb-netflix'] } } };
  const watched = (token: string | null, query: string) =>
    loadChart({
      fetch: globalThis.fetch,
      token,
      cookies: { get: (name) => (name === 'hide_advanced_filters_upsell' ? '1' : undefined) },
      parent: () =>
        Promise.resolve({ datePreferences: { order: 'mdy' }, settings: settings as unknown as ViewerSettings }),
      url: new URL(`https://og.test/shows/watched/monthly?${query}`),
      type: 'shows',
      chart: 'watched',
      period: 'monthly',
    });
  const chart = () =>
    http.get('https://apiz.trakt.tv/shows/watched/monthly', ({ request }) => {
      seen.push(request);
      return HttpResponse.json([{ watcher_count: 3, play_count: 4, show: SHOW }]);
    });

  it("should send the URL's filters to the chart in the API's spelling", async () => {
    server.use(chart());
    const data = await watched(null, 'genres=+drama,+comedy&status=-ended&years=2000-2010&page=2');

    const query = new URL(seen.at(0)?.url ?? '').searchParams;
    expect(query.get('genres')).toBe('drama,comedy');
    expect(query.get('genres_operator')).toBe('and');
    expect(query.get('statuses')).toBe('-ended');
    expect(query.get('years')).toBe('2000-2010');
    expect(query.get('page')).toBe('2');
    expect(data.filters.genres).toEqual({ values: ['drama', 'comedy'], mode: 'all' });
    expect(data.filterSources).toBeUndefined();
    expect(data.upsellHidden).toBe(true);
  });

  it("should filter watch now with the token and load the picked services for the viewer's country", async () => {
    server.use(
      chart(),
      http.get('https://apiz.trakt.tv/watchnow/sources/gb', () =>
        HttpResponse.json([{
          gb: [
            { source: 'netflix', name: 'Netflix', color: '#e50914', images: { logo: null } },
            { source: 'itvx', name: 'ITVX', color: '#000', images: { logo: null } },
          ],
        }])),
    );
    const data = await watched('fake-token', 'watchnow=favorites');

    expect(seen.at(0)?.headers.get('authorization')).toBe('Bearer fake-token');
    expect(new URL(seen.at(0)?.url ?? '').searchParams.get('watchnow')).toBe('favorites');
    expect(data.watchNowCountry).toBe('gb');
    expect(data.watchNowFavorites).toEqual(['netflix']);
    expect([...(data.filterSources?.keys() ?? [])]).toEqual(['netflix']);
  });
});
