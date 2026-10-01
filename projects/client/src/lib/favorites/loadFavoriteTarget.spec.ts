import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadFavoriteTarget } from './loadFavoriteTarget.ts';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('loadFavoriteTarget', () => {
  it('should reuse a summary target without another request', async () => {
    const target = { type: 'movie' as const, id: 1, title: 'Movie', year: 1999 };
    expect(await loadFavoriteTarget(target)).toBe(target);
  });
  it.each(['movie', 'show'] as const)('should read the public %s title band without authorization', async (type) => {
    server.use(http.get(`https://apiz.trakt.tv/${type}s/1`, ({ request }) => {
      expect(request.headers.has('authorization')).toBe(false);
      return HttpResponse.json({
        title: 'Title',
        year: 1999,
        ids: { trakt: 1, slug: 'title' },
        images: { fanart: ['https://media.trakt.tv/images/fanart/full/a.jpg'] },
      });
    }));
    expect(await loadFavoriteTarget({ type, id: 1, title: 'Old title' })).toMatchObject({ title: 'Title', year: 1999 });
  });
  it('should keep the prompt usable when a proxied summary has a malformed body', async () => {
    server.use(
      http.get(
        'https://apiz.trakt.tv/movies/1',
        () => HttpResponse.json({ title: 5 }, { headers: { 'X-Runtime': '0.1' } }),
      ),
    );
    const target = { type: 'movie' as const, id: 1, title: 'Movie' };
    expect(await loadFavoriteTarget(target)).toBe(target);
  });
});
