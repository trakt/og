import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fetchListFanart } from './fetchListFanart.ts';

const API = 'https://apiz.trakt.tv';

const server = setupServer(
  http.get(`${API}/lists/9/items`, () =>
    HttpResponse.json([
      {
        type: 'person',
        person: { name: 'Al Pacino', ids: { trakt: 5, slug: 'al-pacino' } },
        rank: 1,
        id: 1,
        listed_at: '2026-01-01T00:00:00.000Z',
      },
      {
        type: 'movie',
        movie: {
          title: 'Iron Man',
          ids: { trakt: 6, slug: 'iron-man-2008' },
          images: { fanart: ['media.trakt.tv/images/movies/6/fanarts/medium/f.jpg.webp'] },
        },
        rank: 2,
        listed_at: '2026-01-01T00:00:00.000Z',
        id: 2,
      },
    ])),
  http.get(`${API}/lists/10/items`, () => new HttpResponse(null, { status: 404 })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

describe('fetchListFanart', () => {
  it('should take the first item that has fanart, at full size', async () => {
    expect(await fetchListFanart({ id: 9 })).toBe('https://media.trakt.tv/images/movies/6/fanarts/full/f.jpg.webp');
  });

  it('should have none when the read fails', async () => {
    expect(await fetchListFanart({ id: 10 })).toBeUndefined();
  });
});
