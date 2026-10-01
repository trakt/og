import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import { toggleListItem } from './toggleListItem.ts';
import type { ListTarget } from './ListTarget.ts';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const setup = () => ({
  overlay: createOverlay({
    get: () => Promise.resolve(new Response(null, { status: 503 })),
    storage: { load: () => Promise.resolve([]), save: () => Promise.resolve(), clearExcept: () => Promise.resolve() },
  }),
  target: { type: 'movie', id: 1, title: 'Fight Club' } as ListTarget,
  notify: { success: vi.fn(), error: vi.fn() },
  request: (path: string, body: unknown) => rawApiFetch({ path, init: { method: 'POST', body: JSON.stringify(body) } }),
});
describe('toggleListItem', () => {
  it.each(['movie', 'show', 'season', 'episode'] as const)(
    'should add a %s to watchlist and update unknown overlay state before the response',
    async (type) => {
      const params = setup();
      server.use(http.post('https://apiz.trakt.tv/sync/watchlist', async ({ request }) => {
        expect(params.overlay.state(type, 1).watchlisted).toBe(true);
        expect(await request.json()).toEqual({ [`${type}s`]: [{ ids: { trakt: 1 } }] });
        return HttpResponse.json({ added: { [type]: 1 } }, { status: 201 });
      }));
      expect(await toggleListItem({ ...params, target: { ...params.target, type }, list: null, remove: false })).toBe(
        true,
      );
      expect(params.notify.success).toHaveBeenCalled();
    },
  );
  it('should write collaborative list items through their owner and preserve membership in another list', async () => {
    const params = setup();
    server.use(http.post('https://apiz.trakt.tv/users/friend/lists/12/items/remove', () => {
      expect(params.overlay.state('person', 1).listed).toBe(true);
      return HttpResponse.json({ deleted: { people: 1 } });
    }));
    expect(
      await toggleListItem({
        ...params,
        target: { ...params.target, type: 'person' },
        list: { id: 12, owner: 'friend' },
        remove: true,
        stillListed: true,
      }),
    ).toBe(true);
  });
  it.each([401, 420, 429, 500])('should roll back rejected %s writes and silence only 429 toasts', async (status) => {
    const params = setup();
    server.use(http.post('https://apiz.trakt.tv/sync/watchlist', () => HttpResponse.json({}, { status })));
    expect(await toggleListItem({ ...params, list: null, remove: false })).toBe(false);
    expect(params.overlay.state('movie', 1).watchlisted).toBeUndefined();
    expect(params.notify.error).toHaveBeenCalledTimes(status === 429 ? 0 : 1);
  });
  it('should roll back malformed and not-found success bodies', async () => {
    const params = setup();
    for (const body of [null, { not_found: { movies: [{ ids: { trakt: 1 } }] } }]) {
      server.use(http.post('https://apiz.trakt.tv/sync/watchlist', () => HttpResponse.json(body, { status: 201 })));
      expect(await toggleListItem({ ...params, list: null, remove: false })).toBe(false);
      expect(params.overlay.state('movie', 1).watchlisted).toBeUndefined();
    }
  });
  it('should remove an item from the final personal list', async () => {
    const params = setup();
    server.use(
      http.post(
        'https://apiz.trakt.tv/users/me/lists/2/items/remove',
        () => HttpResponse.json({ deleted: { movies: 1 } }),
      ),
    );
    expect(await toggleListItem({ ...params, list: { id: 2, owner: 'me' }, remove: true })).toBe(true);
    expect(params.overlay.state('movie', 1).listed).toBe(false);
  });
});
