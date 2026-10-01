import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { requestRecentSearch } from './requestRecentSearch.ts';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('requestRecentSearch', () => {
  it('should send the native typed pick and accept its empty created response', async () => {
    const body = { query: 'Breaking Bad', type: 'shows', id: 1388 };
    server.use(http.post('https://apiz.trakt.tv/search/recent/', async ({ request }) => {
      expect(await request.json()).toEqual(body);
      expect(request.headers.get('trakt-api-key')).toBeTruthy();
      return new HttpResponse(null, { status: 201 });
    }));
    expect((await requestRecentSearch({ path: '/search/recent', body })).status).toBe(201);
  });

  it('should preserve episode picks and id-less API removals beyond the contract', async () => {
    const pick = { query: 'Pilot', type: 'episodes', id: 73482 };
    const removal = { query: 'Pilot', type: 'episodes' };
    server.use(
      http.post('https://apiz.trakt.tv/search/recent', async ({ request }) => {
        expect(await request.json()).toEqual(pick);
        return new HttpResponse(null, { status: 201 });
      }),
      http.post('https://apiz.trakt.tv/search/recent/remove', async ({ request }) => {
        expect(await request.json()).toEqual(removal);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    expect((await requestRecentSearch({ path: '/search/recent', body: pick })).status).toBe(201);
    expect((await requestRecentSearch({ path: '/search/recent/remove', body: removal })).status).toBe(204);
  });
});
