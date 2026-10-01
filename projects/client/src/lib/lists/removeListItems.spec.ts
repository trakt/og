import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { removeListItems } from './removeListItems.ts';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const endpoint = 'https://apiz.trakt.tv/users/sean/lists/7/items/remove';
const notify = { error: vi.fn() };
const remove = () =>
  removeListItems({
    owner: 'sean',
    listId: 7,
    items: [{ type: 'movie', trakt: 1 }, { type: 'person', trakt: 2 }, { type: 'movie', trakt: 3 }],
    notify,
    request: (path, body) =>
      rawApiFetch({ fetch, token: 'viewer', path, init: { method: 'POST', body: JSON.stringify(body) } }),
  });

describe('removeListItems', () => {
  it('should send the media grouped by type', async () => {
    server.use(http.post(endpoint, async ({ request }) => {
      expect(await request.json()).toEqual({
        movies: [{ ids: { trakt: 1 } }, { ids: { trakt: 3 } }],
        people: [{ ids: { trakt: 2 } }],
      });
      return HttpResponse.json({ deleted: { movies: 2, people: 1 }, not_found: { movies: [] } });
    }));
    await expect(remove()).resolves.toBe(true);
  });

  it("should fail with the API's message", async () => {
    server.use(http.post(endpoint, () => HttpResponse.json({ message: 'Not your list.' }, { status: 401 })));
    await expect(remove()).resolves.toBe(false);
    expect(notify.error).toHaveBeenCalledWith('Not your list.');
  });
});
