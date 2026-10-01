import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadWatchEpisodes } from './loadWatchEpisodes.ts';

const API = 'https://apiz.trakt.tv';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const seasons = [0, 1, 2].map((number) => ({
  number,
  aired: 2,
  completed: 1,
  episodes: [
    { number: 1, completed: true },
    { number: 2, completed: false },
  ],
}));
function setup(progress = 'watched') {
  server.use(http.get(`${API}/shows/5/progress/${progress}`, ({ request }) => {
    expect(request.headers.get('authorization')).toBe('Bearer fake-token');
    expect(new URL(request.url).searchParams.get('hidden')).toBe('true');
    return HttpResponse.json({ seasons });
  }));
  server.use(http.get(`${API}/shows/5/seasons/:season`, ({ request, params }) => {
    expect(request.headers.has('authorization')).toBe(false);
    return HttpResponse.json(
      [1, 2, 3].map((number) => ({ number, ids: { trakt: Number(params.season) * 10 + number } })),
    );
  }));
  return (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, headers: { ...init?.headers, authorization: 'Bearer fake-token' } });
}
describe('loadWatchEpisodes', () => {
  it('should omit specials and unaired episodes for a show', async () => {
    const episodes = await loadWatchEpisodes({ target: { type: 'show', id: 5, title: 'Show' }, fetch: setup() });
    expect(episodes.map(({ id }) => id)).toEqual([11, 12, 21, 22]);
    expect(episodes.filter(({ completed }) => !completed).map(({ id }) => id)).toEqual([12, 22]);
  });
  it('should read collection progress rather than watched history for remaining library episodes', async () => {
    const episodes = await loadWatchEpisodes({
      target: { type: 'show', id: 5, title: 'Show' },
      fetch: setup('collection'),
      progress: 'collection',
    });
    expect(episodes.filter(({ completed }) => !completed).map(({ id }) => id)).toEqual([12, 22]);
  });
  it('should limit a season action to that season and explicitly support specials', async () => {
    const episodes = await loadWatchEpisodes({
      target: {
        type: 'season',
        id: 9,
        title: 'Specials',
        season: { show: 5, number: 0 },
      },
      fetch: setup(),
    });
    expect(episodes.map(({ id }) => id)).toEqual([1, 2]);
  });
  it('should fail without writing when viewer progress is unavailable', async () => {
    const fetch = setup();
    server.use(http.get(`${API}/shows/5/progress/watched`, () => new HttpResponse(null, { status: 403 })));
    await expect(loadWatchEpisodes({ target: { type: 'show', id: 5, title: 'Show' }, fetch })).rejects.toThrow('403');
  });
});
