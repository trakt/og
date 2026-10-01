import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadSeason } from './loadSeason.ts';

const API = 'https://apiz.trakt.tv';
const seen: Request[] = [];
const server = setupServer(
  http.get(`${API}/shows/:id/*`, ({ request }) => {
    seen.push(request);
    const path = new URL(request.url).pathname;
    if (path.endsWith('/info')) return HttpResponse.json({ number: 1, title: 'Season 1', ids: { trakt: 3950 } });
    if (path.endsWith('/people')) return HttpResponse.json({ cast: [], guest_stars: [] });
    if (path.endsWith('/ratings')) return HttpResponse.json({ rating: 8.2, votes: 1600 });
    if (path.endsWith('/stats')) {
      return HttpResponse.json({ watchers: 1, plays: 1, collectors: 0, comments: 0, lists: 0, votes: 1600 });
    }
    return HttpResponse.json([]);
  }),
  http.get(`${API}/shows/:id`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json({ title: 'Breaking Bad', ids: { slug: 'breaking-bad', trakt: 1388 } });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
const params = () => ({
  fetch,
  id: 'breaking-bad',
  season: '1',
  url: new URL('https://og.trakt.tv/shows/breaking-bad/seasons/1?sort=votes,desc&terms=pilot'),
  parent: () =>
    Promise.resolve({
      user: null,
      settings: null,
      datePreferences: { order: 'mdy' as const, hour24: false, timeZone: 'UTC', weekStartDay: 0 as const },
    }),
});

describe('loadSeason', () => {
  it('should load all public reads anonymously and preserve query controls', async () => {
    const data = await loadSeason(params());
    expect(seen).toHaveLength(8);
    expect(seen.every((request) => !request.headers.has('authorization'))).toBe(true);
    expect(data.season.id).toBe(3950);
    expect([data.sort, data.terms]).toEqual(['votes,desc', 'pilot']);
  });
  it('should reject malformed season numbers before fetching', async () => {
    await expect(loadSeason({ ...params(), season: '-1' })).rejects.toMatchObject({ status: 404 });
    expect(seen).toHaveLength(0);
  });
  it('should redirect aliases permanently without losing filters', async () => {
    await expect(loadSeason({ ...params(), id: '1388' })).rejects.toMatchObject({
      status: 301,
      location: '/shows/breaking-bad/seasons/1?sort=votes,desc&terms=pilot',
    });
  });
  it('should report missing seasons as 404 and API failures as 502', async () => {
    server.use(http.get(`${API}/shows/:id/seasons/:season/info`, () => new HttpResponse(null, { status: 404 })));
    await expect(loadSeason(params())).rejects.toMatchObject({ status: 404 });
    server.use(http.get(`${API}/shows/:id/seasons/:season/info`, () => new HttpResponse(null, { status: 500 })));
    await expect(loadSeason(params())).rejects.toMatchObject({ status: 502 });
  });
  it('should report a season the show does not have as 404 when its info answers an empty 204', async () => {
    server.use(
      http.get(`${API}/shows/:id/seasons/:season/info`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/shows/:id/seasons/:season/ratings`, () => new HttpResponse(null, { status: 204 })),
      http.get(`${API}/shows/:id/seasons/:season/stats`, () => new HttpResponse(null, { status: 204 })),
    );
    await expect(loadSeason({ ...params(), season: '99' })).rejects.toMatchObject({ status: 404 });
  });
  it('should reject malformed off-contract cast data at the boundary', async () => {
    server.use(
      http.get(
        `${API}/shows/:id/seasons/:season/people`,
        () => HttpResponse.json({ cast: [{ person: { name: 42 } }] }),
      ),
    );
    await expect(loadSeason(params())).rejects.toMatchObject({ status: 502 });
  });
});
