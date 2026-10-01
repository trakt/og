import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createOverlay } from '../overlay/createOverlay.svelte.ts';
import { rawApiFetch } from '../api/rawApiFetch.ts';
import { toListView } from './toListView.ts';
import { transferListItems } from './transferListItems.ts';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());
const source = toListView({
  name: 'Heist Night',
  description: 'A description',
  privacy: 'link',
  type: 'personal',
  display_numbers: true,
  allow_comments: true,
  sort_by: 'rank',
  sort_how: 'asc',
  item_count: 3,
  likes: 0,
  comment_count: 0,
  ids: { trakt: 1, slug: 'heist-night' },
  user: { username: 'friend', ids: { slug: 'friend' } },
});
const items = [{ id: 10, type: 'movie', trakt: 100 }, { id: 11, type: 'show', trakt: 200 }, {
  id: 12,
  type: 'person',
  trakt: 300,
}] as const;
const target = { id: 2, owner: 'collaborator', name: 'Target' };
const rollback = vi.fn();
const overlay = { patch: vi.fn(() => rollback) };
const notify = { error: vi.fn() };
const read = vi.fn(() =>
  Promise.resolve(
    [
      { id: 21, type: 'show', trakt: 200 },
      { id: 22, type: 'movie', trakt: 999 },
      { id: 23, type: 'movie', trakt: 100 },
    ] as const,
  )
);
const writes: string[] = [];
const request = (path: string, body: unknown) => {
  writes.push(path);
  return rawApiFetch({ fetch, path, init: { method: 'POST', body: JSON.stringify(body) } });
};
const transfer = (options: Partial<Parameters<typeof transferListItems>[0]> = {}) => {
  writes.length = 0;
  return transferListItems({
    source,
    sort: { by: 'title', how: 'desc' },
    items,
    destination: target,
    move: true,
    request,
    read,
    overlay,
    notify,
    ...options,
  });
};
const add = 'https://apiz.trakt.tv/users/collaborator/lists/2/items';
const reorder = `${add}/reorder`;
const remove = 'https://apiz.trakt.tv/users/friend/lists/1/items/remove';
function success() {
  server.use(
    http.post(add, async ({ request }) => {
      expect(await request.json()).toEqual({ movies: [{ ids: { trakt: 100 } }], shows: [{ ids: { trakt: 200 } }] });
      return HttpResponse.json({ added: { movies: 1, shows: 0 }, existing: { shows: 1 }, not_found: {} });
    }),
    http.post(reorder, async ({ request }) => {
      expect(await request.json()).toEqual({ rank: [22, 23, 21] });
      return HttpResponse.json({ updated: 3, skipped_ids: [] });
    }),
    http.post(remove, async ({ request }) => {
      expect(await request.json()).toEqual({ movies: [{ ids: { trakt: 100 } }], shows: [{ ids: { trakt: 200 } }] });
      return HttpResponse.json({ deleted: { movies: 1, shows: 1 } });
    }),
  );
}
describe('transferListItems', () => {
  it('should append the selection in its displayed order and remove only accepted media after ordering', async () => {
    success();
    expect(await transfer()).toEqual({ ok: true, target, count: 2, skipped: 1 });
    expect(writes).toEqual([
      '/users/collaborator/lists/2/items',
      '/users/collaborator/lists/2/items/reorder',
      '/users/friend/lists/1/items/remove',
    ]);
    expect(overlay.patch).toHaveBeenCalledWith('listed', expect.any(Function), expect.any(Object));
    expect(rollback).not.toHaveBeenCalled();
  });
  it('should reject repeated source media before any write', async () => {
    expect((await transfer({ items: [items[0], items[0]] })).ok).toBe(false);
    expect(writes).toHaveLength(0);
  });
  it('should reject transferring into the source', async () => {
    expect((await transfer({ destination: { ...target, id: source.id } })).ok).toBe(false);
    expect(writes).toHaveLength(0);
  });

  it('should patch unknown membership before adding and restore it when the add fails', async () => {
    const actual = createOverlay({
      get: () => Promise.resolve(new Response(null, { status: 503 })),
      storage: { load: () => Promise.resolve([]), save: () => Promise.resolve(), clearExcept: () => Promise.resolve() },
    });
    await actual.start('tester');
    server.use(http.post(add, () => {
      expect(actual.state('movie', 100).listed).toBe(true);
      expect(actual.state('show', 200).listed).toBe(true);
      expect(actual.state('person', 300).listed).toBe(false);
      return new HttpResponse(null, { status: 500 });
    }));
    expect((await transfer({ overlay: actual })).ok).toBe(false);
    expect(actual.state('movie', 100).listed).toBeUndefined();
  });

  it('should copy without removing the source', async () => {
    success();
    expect((await transfer({ move: false })).ok).toBe(true);
    expect(writes).not.toContain('/users/friend/lists/1/items/remove');
  });
  it('should keep the source and roll back the overlay when adding partially succeeds', async () => {
    server.use(
      http.post(add, () => HttpResponse.json({ added: { movies: 1 }, existing: {}, not_found: { shows: [{}] } })),
    );
    expect((await transfer()).ok).toBe(false);
    expect(writes).toHaveLength(1);
    expect(rollback).toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith('Some items could not be copied. The source list was kept.');
  });
  it('should keep the source when the destination read omits an item', async () => {
    success();
    expect((await transfer({ read: () => Promise.resolve([]) })).ok).toBe(false);
    expect(writes).toHaveLength(1);
  });
  it('should keep added overlay membership and the source when saving order fails', async () => {
    success();
    server.use(http.post(reorder, () => HttpResponse.json({ updated: 1, skipped_ids: [23] })));
    expect((await transfer()).ok).toBe(false);
    expect(writes).toHaveLength(2);
    expect(rollback).not.toHaveBeenCalled();
  });
  it('should report a failed removal after a successful copy', async () => {
    success();
    server.use(http.post(remove, () => HttpResponse.json({ message: 'Denied' }, { status: 403 })));
    expect((await transfer()).ok).toBe(false);
    expect(notify.error).toHaveBeenCalledWith(
      'Items were copied, but could not be removed from the source. Retry Move to finish.',
    );
  });
  it('should clone metadata with link privacy made private and retain the created target on failure', async () => {
    server.use(
      http.post('https://apiz.trakt.tv/users/me/lists', async ({ request }) => {
        expect(await request.json()).toEqual({
          name: 'Heist Night copy',
          description: 'A description',
          privacy: 'private',
          display_numbers: true,
          allow_comments: true,
          sort_by: 'title',
          sort_how: 'desc',
        });
        return HttpResponse.json({ ids: { trakt: 3 }, name: 'Heist Night copy', privacy: 'private', item_count: 0 }, {
          status: 201,
        });
      }),
      http.post(
        'https://apiz.trakt.tv/users/me/lists/3/items',
        () => HttpResponse.json({ message: 'Full' }, { status: 420 }),
      ),
    );
    expect(await transfer({ destination: null })).toEqual({
      ok: false,
      target: { id: 3, owner: 'me', name: 'Heist Night copy' },
    });
    expect(notify.error).toHaveBeenCalledWith('Full');
  });
  it('should add and reorder a watchlist, with its own overlay slice', async () => {
    server.use(
      http.post(
        'https://apiz.trakt.tv/sync/watchlist',
        () => HttpResponse.json({ added: { movies: 1, shows: 1 }, existing: {} }),
      ),
      http.post('https://apiz.trakt.tv/sync/watchlist/reorder', async ({ request }) => {
        expect(await request.json()).toEqual({ rank: [22, 23, 21] });
        return HttpResponse.json({ updated: 3, skipped_ids: [] });
      }),
    );
    expect(
      (await transfer({ move: false, destination: { id: 0, name: 'Watchlist', owner: 'me', watchlist: true } })).ok,
    ).toBe(true);
    expect(overlay.patch).toHaveBeenCalledWith('watchlist', expect.any(Function), expect.any(Object));
  });
  it('should move from a watchlist through its sync removal and shared overlay helper', async () => {
    success();
    server.use(http.post('https://apiz.trakt.tv/sync/watchlist/remove', async ({ request }) => {
      const body = await request.json();
      expect(body).toEqual({
        movies: [{ ids: { trakt: 100 } }],
        shows: [{ ids: { trakt: 200 } }],
        seasons: [],
        episodes: [],
      });
      return HttpResponse.json({ deleted: { movies: 1, shows: 1 }, not_found: {} });
    }));
    expect((await transfer({ source: { ...source, kind: 'watchlist' } })).ok).toBe(true);
    expect(writes.at(-1)).toBe('/sync/watchlist/remove');
    expect(overlay.patch).toHaveBeenCalledWith('watchlist', expect.any(Function), expect.any(Object));
  });

  it('should avoid add and remove writes for a people-only selection', async () => {
    expect(await transfer({ items: [items[2]] })).toEqual({ ok: true, target, count: 0, skipped: 1 });
    expect(writes).toHaveLength(0);
  });
  it('should roll back without another toast on a rate limit', async () => {
    server.use(http.post(add, () => new HttpResponse(null, { status: 429 })));
    expect((await transfer()).ok).toBe(false);
    expect(rollback).toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
  });
  it('should reject a malformed add response and keep the source', async () => {
    server.use(http.post(add, () => HttpResponse.json({ success: true })));
    expect((await transfer()).ok).toBe(false);
    expect(writes).toHaveLength(1);
    expect(rollback).toHaveBeenCalled();
  });
});
