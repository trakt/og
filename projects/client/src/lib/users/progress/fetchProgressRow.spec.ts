import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { workerUnauthorized } from '../../api/workerUnauthorized.ts';
import { fetchProgressRow } from './fetchProgressRow.ts';
import { progressFixture } from './progressFixture.ts';

const API = 'https://apiz.trakt.tv';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const [breakingBad, gameOfThrones] = progressFixture.watched;
const params = {
  fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
  slug: 'demo',
  type: 'watched' as const,
  show: { id: 1390, title: 'Game of Thrones' },
};

describe('fetchProgressRow', () => {
  it("should narrow the viewer's progress to the title and pick the show out", async () => {
    server.use(http.get(`${API}/users/demo/progress/watched`, ({ request }) => {
      const query = new URL(request.url).searchParams;
      expect(Object.fromEntries(query)).toEqual({
        terms: 'Game of Thrones',
        include_seasons: 'true',
        extended: 'full,images',
        limit: '250',
      });
      // `terms` also matches next-episode titles, so other shows can come back too.
      return HttpResponse.json([breakingBad, gameOfThrones]);
    }));

    expect(await fetchProgressRow(params)).toEqual(gameOfThrones);
  });

  it('should read Library rows from the collection progress, with the saved Up Next rule', async () => {
    const [row] = progressFixture.collection;
    server.use(http.get(`${API}/users/demo/progress/collection`, ({ request }) => {
      expect(new URL(request.url).searchParams.get('last_activity')).toBe('collected');
      return HttpResponse.json([row]);
    }));

    const show = { id: 1388, title: 'Breaking Bad' };
    expect(await fetchProgressRow({ ...params, type: 'library', show, lastActivity: 'collected' })).toEqual(row);
  });

  it('should reject when the show is no longer in the progress', async () => {
    server.use(http.get(`${API}/users/demo/progress/watched`, () => HttpResponse.json([breakingBad])));

    await expect(fetchProgressRow(params)).rejects.toThrow('show not found');
  });

  it('should reject a token the worker refuses', async () => {
    server.use(http.get(`${API}/users/demo/progress/watched`, () => workerUnauthorized()));

    await expect(fetchProgressRow(params)).rejects.toThrow('401');
  });

  it('should reject a failed or malformed read', async () => {
    server.use(http.get(`${API}/users/demo/progress/watched`, () => HttpResponse.json({ error: true })));
    await expect(fetchProgressRow(params)).rejects.toThrow();

    server.use(http.get(`${API}/users/demo/progress/watched`, () => new HttpResponse(null, { status: 502 })));
    await expect(fetchProgressRow(params)).rejects.toThrow('502');
  });
});
