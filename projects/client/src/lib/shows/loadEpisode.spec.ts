import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadEpisode } from './loadEpisode.ts';
const API = 'https://apiz.trakt.tv';
const seen: Request[] = [];
const episode = { season: 1, number: 1, title: 'Pilot', ids: { trakt: 73482 }, first_aired: '2008-01-21T02:00:00Z' };
const server = setupServer(
  http.get(`${API}/shows/:id/*`, ({ request }) => {
    seen.push(request);
    const path = new URL(request.url).pathname;
    if (path.endsWith('/info')) return HttpResponse.json({ number: 1, ids: { trakt: 3950 } });
    if (path.endsWith('/people')) return HttpResponse.json({ cast: [], crew: {} });
    if (path.endsWith('/ratings')) return HttpResponse.json({ rating: 8.2, votes: 1600 });
    if (path.endsWith('/stats')) {
      return HttpResponse.json({ watchers: 1, plays: 1, collectors: 0, comments: 0, lists: 0, votes: 1600 });
    }
    if (path.endsWith('/episodes/1')) {
      return HttpResponse.json(episode);
    }
    if (path.endsWith('/seasons')) {
      return HttpResponse.json([{ number: 1, episodes: [episode] }]);
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
  episode: '1',
  url: new URL('https://og.trakt.tv/shows/breaking-bad/seasons/1/episodes/1?foo=bar'),
  parent: () =>
    Promise.resolve({
      user: null,
      settings: null,
      datePreferences: { order: 'mdy' as const, hour24: false, timeZone: 'UTC', weekStartDay: 0 as const },
    }),
});
describe('loadEpisode', () => {
  it('should load all public reads anonymously and preserve layout preferences', async () => {
    const data = await loadEpisode(params());
    expect(seen).toHaveLength(10);
    expect(seen.every((request) => !request.headers.has('authorization'))).toBe(true);
    expect(data.episode.id).toBe(73482);
    expect(data.datePreferences.timeZone).toBe('UTC');
  });
  it('should reject invalid numbers before fetching', async () => {
    await expect(loadEpisode({ ...params(), episode: '-1' })).rejects.toMatchObject({ status: 404 });
    expect(seen).toHaveLength(0);
  });
  it('should redirect aliases and padded numbers permanently while retaining queries', async () => {
    await expect(loadEpisode({ ...params(), id: '1388', season: '01' })).rejects.toMatchObject({
      status: 301,
      location: '/shows/breaking-bad/seasons/1/episodes/1?foo=bar',
    });
  });
  it('should distinguish missing episodes from upstream failures', async () => {
    server.use(
      http.get(`${API}/shows/:id/seasons/:season/episodes/:episode`, () => new HttpResponse(null, { status: 404 })),
    );
    await expect(loadEpisode(params())).rejects.toMatchObject({ status: 404 });
    server.use(
      http.get(`${API}/shows/:id/seasons/:season/episodes/:episode`, () => new HttpResponse(null, { status: 500 })),
    );
    await expect(loadEpisode(params())).rejects.toMatchObject({ status: 502 });
  });
  it('should reject malformed off-contract navigation and cast data', async () => {
    server.use(
      http.get(`${API}/shows/:id/seasons`, () => HttpResponse.json([{ number: 1, episodes: [{ number: 'bad' }] }])),
    );
    await expect(loadEpisode(params())).rejects.toMatchObject({ status: 502 });
  });
  it('should validate API summary bodies', async () => {
    server.use(
      http.get(
        `${API}/shows/:id/seasons/:season/episodes/:episode`,
        () => HttpResponse.json({ title: 42 }, { headers: { 'X-Runtime': '0.1' } }),
      ),
    );
    await expect(loadEpisode(params())).rejects.toMatchObject({ status: 502 });
  });
});
