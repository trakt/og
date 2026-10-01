import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadSyncDetails } from './loadSyncDetails.ts';
import { syncItemsFixture, syncsFixture } from './syncsFixture.ts';

const API = 'https://apiz.trakt.tv';
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const seen: string[] = [];
const count = (n: number) => ({
  'x-pagination-page-count': String(Math.ceil(n / 10)),
  'x-pagination-item-count': String(n),
});
const server = setupServer(
  http.get(`${API}/users/syncs/:id`, ({ request, params }) => {
    seen.push(new URL(request.url).pathname + new URL(request.url).search);
    const sync = syncsFixture.find((row) => String(row.id) === params.id);
    return sync ? HttpResponse.json(sync) : new HttpResponse(null, { status: 404 });
  }),
  http.get(`${API}/users/syncs/:id/paused`, ({ request }) => {
    seen.push(new URL(request.url).pathname + new URL(request.url).search);
    return HttpResponse.json(syncItemsFixture.paused, { headers: count(2) });
  }),
  http.get(`${API}/users/syncs/:id/skipped`, ({ request }) => {
    seen.push(new URL(request.url).pathname + new URL(request.url).search);
    return HttpResponse.json(syncItemsFixture.skipped, { headers: count(14) });
  }),
  http.get(`${API}/watchnow/sources/us`, () => HttpResponse.json([{ us: [] }])),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const passthrough: typeof fetch = (...args) => globalThis.fetch(...args);
const load = (id: string, search = '', token: string | null = 'viewer') =>
  loadSyncDetails({
    fetch: passthrough,
    locals: { token },
    parent: () => Promise.resolve({ datePreferences }),
    params: { id },
    url: new URL(`https://og.trakt.tv/settings/syncs/${id}${search}`),
  });

describe('loadSyncDetails', () => {
  it('should read the sync and a page of its paused and skipped items, ten a page', async () => {
    const data = await load('102', '?page=2');
    expect(seen.toSorted()).toEqual([
      '/users/syncs/102',
      '/users/syncs/102/paused?page=2&limit=10',
      '/users/syncs/102/skipped?page=2&limit=10',
    ]);
    expect(data).toMatchObject({
      expired: false,
      id: 102,
      kind: 'younify',
      paused: { count: 2, page: { current: 2, total: 1 } },
      skipped: { count: 14, page: { current: 2, total: 2 }, table: { section: 'History' } },
    });
  });

  it("should lay a Plex sync's items out as OG's Plex table", async () => {
    const data = await load('157');
    expect(data.expired || data.skipped.table.headers).toContain('IMDB ID');
  });

  it("should 404 someone else's sync, which API scopes away", async () => {
    await expect(load('999')).rejects.toMatchObject({ status: 404 });
  });

  it('should render expired on a 401 and redirect when logged out', async () => {
    server.use(http.get(`${API}/users/syncs/:id/skipped`, () => new HttpResponse(null, { status: 401 })));
    expect(await load('102')).toEqual({ expired: true });
    await expect(load('102', '', null)).rejects.toMatchObject({ status: 302 });
  });
});
