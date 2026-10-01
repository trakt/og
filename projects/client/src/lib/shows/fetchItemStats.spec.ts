import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fetchItemStats } from './fetchItemStats.ts';

const stats = { watchers: 12, plays: 34, collectors: 5, lists: 6, comments: 7, votes: 8 };
const seen: Headers[] = [];
const server = setupServer(http.get('https://apiz.trakt.tv/shows/1/seasons/*', ({ request }) => {
  seen.push(request.headers);
  return HttpResponse.json(stats);
}));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

describe('fetchItemStats', () => {
  it('should fetch season and episode stats publicly, including Specials', async () => {
    expect(await fetchItemStats({ show: 1, season: 0 })).toEqual(stats);
    expect(await fetchItemStats({ show: 1, season: 1, episode: 2 })).toEqual(stats);
    expect(seen).toHaveLength(2);
    expect(seen.every((headers) => !headers.has('authorization'))).toBe(true);
  });

  it('should leave HTTP failures and malformed or proxied bodies empty', async () => {
    server.use(http.get('https://apiz.trakt.tv/shows/1/seasons/*', () => new HttpResponse(null, { status: 429 })));
    expect(await fetchItemStats({ show: 1, season: 1 })).toBeNull();
    server.use(
      http.get(
        'https://apiz.trakt.tv/shows/1/seasons/*',
        () => HttpResponse.json({ watchers: 'twelve' }, { headers: { 'X-Runtime': '0.2' } }),
      ),
    );
    expect(await fetchItemStats({ show: 1, season: 1 })).toBeNull();
    server.use(
      http.get(
        'https://apiz.trakt.tv/shows/1/seasons/*',
        () => HttpResponse.json(stats, { headers: { 'X-Runtime': '0.2' } }),
      ),
    );
    expect(await fetchItemStats({ show: 1, season: 1 })).toEqual(stats);
  });
});
