import { isHttpError, isRedirect } from '@sveltejs/kit';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { SubpageItem } from '../subpage/SubpageItem.ts';
import { loadStats } from './loadStats.ts';

const API = 'https://apiz.trakt.tv';
const show = {
  title: 'Breaking Bad',
  year: 2008,
  ids: { trakt: 1388, slug: 'breaking-bad' },
  first_aired: '2008-01-20',
};
const movie = { title: 'Fight Club', year: 1999, ids: { trakt: 1, slug: 'fight-club-1999' }, released: '1999-10-15' };
const season = { number: 1, ids: { trakt: 3950 }, first_aired: '2008-01-20' };
const episode = { season: 1, number: 1, title: 'Pilot', ids: { trakt: 73482 }, first_aired: '2008-01-20' };
const ratings = {
  rating: 8.5,
  votes: 42,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 2, 9: 30, 10: 10 },
};
const stats = { watchers: 10, plays: 20, collectors: 30, comments: 40, lists: 50, votes: 42, favorited: 60 };
const requests: Request[] = [];
const server = setupServer(
  http.get(`${API}/movies/:id`, () => HttpResponse.json(movie)),
  http.get(`${API}/shows/:id`, () => HttpResponse.json(show)),
  http.get(`${API}/shows/:id/seasons/:season/info`, () => HttpResponse.json(season)),
  http.get(`${API}/shows/:id/seasons/:season/episodes/:episode`, () => HttpResponse.json(episode)),
  http.get(`${API}/*/ratings`, () => HttpResponse.json(ratings)),
  http.get(`${API}/*/stats`, () => HttpResponse.json(stats)),
  http.get(`${API}/*`, () => new HttpResponse(null, { status: 404 })),
);
server.events.on('request:start', ({ request }) => void requests.push(request));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
afterAll(() => server.close());
const load = (item: SubpageItem) =>
  loadStats({
    fetch: globalThis.fetch,
    parent: () =>
      Promise.resolve({
        user: null,
        settings: null,
        datePreferences: { order: 'ymd', hour24: false, timeZone: 'UTC', weekStartDay: 0 },
      }),
    item,
  });
const failure = (promise: Promise<unknown>) => promise.then(() => null, (error: unknown) => error);

describe('loadStats', () => {
  it.each<SubpageItem>([
    { type: 'movie', id: 'fight-club-1999' },
    { type: 'show', id: 'breaking-bad' },
    { type: 'season', id: 'breaking-bad', season: '1' },
    { type: 'episode', id: 'breaking-bad', season: '1', episode: '1' },
  ])('should load public $type ratings and stats without sibling reads or a token', async (item) => {
    const data = await load(item);
    expect(data.stats.percent).toBe(85);
    expect(data.stats.strip.ratingTarget.type).toBe(item.type);
    expect(data.previous).toBeUndefined();
    expect(data.next).toBeUndefined();
    expect(requests.every((request) => !request.headers.has('authorization'))).toBe(true);
    expect(requests.some((request) => new URL(request.url).pathname.endsWith('/seasons'))).toBe(false);
    const ratingRequest = new URL(requests.find((request) => request.url.includes('/ratings'))?.url ?? API);
    expect(ratingRequest.pathname).toBe(`${data.media.href}/ratings`);
    expect(ratingRequest.searchParams.get('extended')).toBe(item.type === 'season' ? null : 'all');
  });

  it('should preserve the stats suffix on canonical redirects', async () => {
    const result = await failure(load({ type: 'show', id: '1388' }));
    expect(isRedirect(result) && result.location).toBe('/shows/breaking-bad/stats');
  });

  it('should report 404 for missing media and invalid season numbers', async () => {
    server.use(
      http.get(`${API}/movies/:id`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return new HttpResponse(null, { status: 404 });
      }),
      http.get(`${API}/movies/:id/ratings`, () => new HttpResponse(null, { status: 404 })),
    );
    for (
      const item of [{ type: 'movie', id: 'missing' }, { type: 'season', id: 'breaking-bad', season: 'bad' }] as const
    ) {
      const result = await failure(load(item));
      expect(isHttpError(result) && result.status).toBe(404);
    }
  });

  it('should report 404 for a season the show does not have, whose reads answer an empty 204', async () => {
    server.use(
      http.get(`${API}/shows/:id/seasons/:season/info`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/shows/:id/seasons/:season/ratings`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/shows/:id/seasons/:season/stats`, () => new HttpResponse(null, { status: 204 })),
    );
    const result = await failure(load({ type: 'season', id: 'breaking-bad', season: '99' }));
    expect(isHttpError(result) && result.status).toBe(404);
  });

  it('should report 502 for failed ratings and malformed stats including API bodies', async () => {
    server.use(http.get(`${API}/*/ratings`, () => new HttpResponse(null, { status: 503 })));
    const unavailable = await failure(load({ type: 'show', id: 'breaking-bad' }));
    expect(isHttpError(unavailable) && unavailable.status).toBe(502);
    server.resetHandlers();
    server.use(
      http.get(
        `${API}/*/stats`,
        () => HttpResponse.json({ ...stats, watchers: 'ten' }, { headers: { 'X-Runtime': '0.1' } }),
      ),
    );
    const malformed = await failure(load({ type: 'show', id: 'breaking-bad' }));
    expect(isHttpError(malformed) && malformed.status).toBe(502);
  });
});
