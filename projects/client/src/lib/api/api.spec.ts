import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { api } from './api.ts';
import { TRAKT_CLIENT_ID } from './traktClientId.ts';
import { workerUnauthorized } from './workerUnauthorized.ts';

const seen: Headers[] = [];
const server = setupServer(
  http.get('https://apiz.trakt.tv/movies/:id', ({ request }) => {
    seen.push(request.headers);
    return HttpResponse.json({ title: 'TRON: Legacy' });
  }),
  http.get('http://localhost:8787/movies/:id', () => HttpResponse.json({ title: 'local' })),
  http.get('https://apiz.trakt.tv/sync/progress/up_next', () => workerUnauthorized()),
  http.get('https://apiz.trakt.tv/shows/:id/seasons/:season/stats', ({ params }) => HttpResponse.json(params)),
  http.get(
    'https://apiz.trakt.tv/shows/:id/seasons/:season/episodes/:episode/stats',
    ({ params }) => HttpResponse.json(params),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

describe('api', () => {
  it('should send the api key and version headers', async () => {
    const response = await api().movies.summary({ params: { id: 'tron-legacy-2010' } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ title: 'TRON: Legacy' });
    expect(seen.at(0)?.get('trakt-api-key')).toBe(TRAKT_CLIENT_ID);
    expect(seen.at(0)?.get('trakt-api-version')).toBe('2');
  });

  it('should send a Bearer token when there is one', async () => {
    await api({ token: 'abc' }).movies.summary({ params: { id: 'tron-legacy-2010' } });

    expect(seen.at(0)?.get('authorization')).toBe('Bearer abc');
  });

  it('should send no Authorization header without a token', async () => {
    await api({ token: null }).movies.summary({ params: { id: 'tron-legacy-2010' } });

    expect(seen.at(0)?.has('authorization')).toBe(false);
  });

  it('should target the given environment', async () => {
    const response = await api({ environment: 'http://localhost:8787' }).movies.summary({
      params: { id: 'tron-legacy-2010' },
    });

    expect(response.body).toEqual({ title: 'local' });
  });

  it("should answer a stale token's plain-text 401 with its status instead of throwing", async () => {
    const response = await api({ token: 'stale' }).sync.progress.upNext.standard({ query: {} });

    expect(response.status).toBe(401);
    expect(response.body).toBe('Unauthorized');
  });

  describe('for numeric path params', () => {
    it('should keep a season 0 (Specials) in the path', async () => {
      const response = await api().shows.season.stats({ params: { id: '1388', season: 0 } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: '1388', season: '0' });
    });

    it('should keep a season 0 episode in the path', async () => {
      const response = await api().shows.episode.stats({ params: { id: 'breaking-bad', season: 0, episode: 1 } });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: 'breaking-bad', season: '0', episode: '1' });
    });
  });
});
