import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createOverlay } from '../../overlay/createOverlay.svelte.ts';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { restoreHiddenItem } from './restoreHiddenItem.ts';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const item = {
  key: 'show:1',
  id: 1,
  type: 'show' as const,
  title: 'The Boys',
  sortTitle: 'boys',
  parentTitle: undefined,
  image: undefined,
  date: '',
  hiddenAt: '2026-09-27T12:00:00Z',
};
async function setup() {
  const overlay = createOverlay({
    get: () => Promise.resolve(new Response(null, { status: 503 })),
    storage: {
      clearExcept: () => Promise.resolve(),
      save: () => Promise.resolve(),
      load: () =>
        Promise.resolve([{ name: 'dropped', activity: '', data: new Map([[1, item.hiddenAt], [2, item.hiddenAt]]) }, {
          name: 'rewatching',
          activity: '',
          data: new Map([[1, item.hiddenAt]]),
        }]),
    },
  });
  await overlay.start('tester');
  overlay.patch('hidden', () => new Map([['calendar', new Set(['show:1', 'show:2'])]]), new Map());
  return {
    item,
    overlay,
    notify: { success: vi.fn(), error: vi.fn() },
    request: (path: string, body: unknown) =>
      rawApiFetch({
        path,
        init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      }),
  };
}
describe('restoreHiddenItem', () => {
  it.each([['dropped', 'dropped'], ['rewatching', 'progress_watched_reset'], ['calendars', 'calendar']] as const)(
    'should optimistically restore %s and retain unrelated items',
    async (type, section) => {
      const params = await setup();
      server.use(http.post(`https://apiz.trakt.tv/users/hidden/${section}/remove`, async ({ request }) => {
        expect(await request.json()).toEqual({ shows: [{ ids: { trakt: 1 } }] });
        if (type === 'calendars') expect(params.overlay.isHidden('calendar', 'show', 1)).toBe(false);
        else expect(params.overlay.state('show', 1)[type === 'dropped' ? 'dropped' : 'rewatching']).toBe(false);
        return HttpResponse.json({ deleted: { shows: 1 } });
      }));
      expect(await restoreHiddenItem({ ...params, type })).toBe(true);
      expect(params.overlay.state('show', 2).dropped).toBe(true);
      expect(params.notify.success).toHaveBeenCalledOnce();
    },
  );
  it('should use the slug to unblock an author whose numeric id is absent', async () => {
    const params = await setup();
    server.use(http.post('https://apiz.trakt.tv/users/hidden/comments/remove', async ({ request }) => {
      expect(await request.json()).toEqual({ users: [{ ids: { slug: 'reader' } }] });
      return HttpResponse.json({ deleted: { users: 1 } });
    }));
    expect(
      await restoreHiddenItem({
        ...params,
        type: 'comments',
        item: { ...item, type: 'user', id: 'reader', key: 'user:reader' },
      }),
    ).toBe(true);
  });
  it.each([
    new Response(null, { status: 503 }),
    Response.json({ deleted: { shows: 0 } }),
    Response.json({ deleted: { shows: 1 }, not_found: { shows: [{}] } }),
    Response.json({ nonsense: true }),
  ])('should rollback a rejected or malformed write', async (response) => {
    const params = await setup();
    expect(await restoreHiddenItem({ ...params, type: 'dropped', request: () => Promise.resolve(response.clone()) }))
      .toBe(false);
    expect(params.overlay.state('show', 1)).toMatchObject({ dropped: true, droppedAt: item.hiddenAt });
    expect(params.notify.error).toHaveBeenCalledOnce();
  });
});
