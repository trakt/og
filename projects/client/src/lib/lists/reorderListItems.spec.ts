import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { reorderListItems } from './reorderListItems.ts';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const endpoint = 'https://apiz.trakt.tv/users/sean%20c/lists/7/items/reorder';
const notify = { error: vi.fn() };
beforeEach(() => notify.error.mockReset());
const reorder = (failure?: string) =>
  reorderListItems({
    owner: 'sean c',
    listId: 7,
    rank: [3, 1, 2],
    notify,
    failure,
    request: (path, body) =>
      rawApiFetch({ fetch, token: 'viewer', path, init: { method: 'POST', body: JSON.stringify(body) } }),
  });

describe('reorderListItems', () => {
  it("should send the order to the owner's path", async () => {
    server.use(http.post(endpoint, async ({ request }) => {
      expect(await request.json()).toEqual({ rank: [3, 1, 2] });
      return HttpResponse.json({ updated: 2, skipped_ids: [], list: { item_count: 3 } }, {
        headers: { 'X-Runtime': '0.1' },
      });
    }));
    await expect(reorder()).resolves.toBe(true);
    expect(notify.error).not.toHaveBeenCalled();
  });

  it("should fail with the API's message, or the caller's", async () => {
    server.use(http.post(endpoint, () => HttpResponse.json({ message: 'Nope.' }, { status: 401 })));
    await expect(reorder()).resolves.toBe(false);
    await expect(reorder('Doh!')).resolves.toBe(false);
    expect(notify.error.mock.calls).toEqual([['Nope.'], ['Doh!']]);
  });

  it('should fail when the list skipped an id or the body is off-contract', async () => {
    server.use(http.post(endpoint, () => HttpResponse.json({ updated: 2, skipped_ids: [3] })));
    await expect(reorder()).resolves.toBe(false);
    server.use(http.post(endpoint, () => HttpResponse.json({ ok: true })));
    await expect(reorder()).resolves.toBe(false);
    expect(notify.error).toHaveBeenCalledWith('Doh! We ran into some sort of error.');
  });

  it('should stay quiet on a rate limit', async () => {
    server.use(http.post(endpoint, () => new HttpResponse(null, { status: 429 })));
    await expect(reorder()).resolves.toBe(false);
    expect(notify.error).not.toHaveBeenCalled();
  });
});
