import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { redirectToList } from './redirectToList.ts';

const list = (type: string, slug: string) => ({
  type,
  ids: { trakt: 1, slug },
  user: { username: 'Sean', ids: { slug: 'sean' } },
});

const server = setupServer(
  http.get('https://apiz.trakt.tv/lists/:id', ({ params, request }) => {
    if (params.id === '1') return HttpResponse.json(list('personal', 'heist'));
    if (params.id === '2') return HttpResponse.json(list('official', 'the-dark-knight-collection'));
    if (params.id === '3' && request.headers.get('authorization')) {
      return HttpResponse.json(list('watchlist', 'watchlist'));
    }
    return new HttpResponse(null, { status: 204, headers: { 'content-type': 'application/json' } });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

const go = (id: string, token: string | null = null) => redirectToList({ fetch, locals: { token }, params: { id } });

describe('redirectToList', () => {
  it('should 301 each list type to its page', async () => {
    await expect(go('1')).rejects.toMatchObject({ status: 301, location: '/users/sean/lists/heist' });
    await expect(go('2')).rejects.toMatchObject({
      status: 301,
      location: '/lists/official/the-dark-knight-collection',
    });
  });

  it('should read a list only the viewer can see with the token', async () => {
    await expect(go('3', 'abc')).rejects.toMatchObject({ status: 301, location: '/users/sean/watchlist' });
  });

  it('should 404 a list the viewer cannot see', async () => {
    await expect(go('3')).rejects.toMatchObject({ status: 404 });
  });
});
