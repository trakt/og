import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { loadSyncs } from './loadSyncs.ts';
import { syncsFixture } from './syncsFixture.ts';

const API = 'https://apiz.trakt.tv';
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const seen: Request[] = [];
const pages = { 'x-pagination-page-count': '2', 'x-pagination-item-count': '7' };
const server = setupServer(
  http.get(`${API}/users/syncs/import`, ({ request }) => {
    seen.push(request);
    const limit = new URL(request.url).searchParams.get('limit');
    return HttpResponse.json(limit === '1' ? syncsFixture.slice(0, 1) : syncsFixture.slice(4), { headers: pages });
  }),
  http.get(`${API}/users/syncs`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json(syncsFixture, { headers: { ...pages, 'x-pagination-page-count': '1' } });
  }),
  http.get(
    `${API}/watchnow/sources/us`,
    () =>
      HttpResponse.json([{
        us: [{ source: 'plex', name: 'Plex', color: '#000', images: { logo: 'media.trakt.tv/plex.webp' } }],
      }]),
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

// Never capture globalThis.fetch itself: a reference taken before listen() skips MSW.
const passthrough: typeof fetch = (...args) => globalThis.fetch(...args);
const load = (scope: 'import' | 'all', path = '/settings/data', token: string | null = 'viewer') =>
  loadSyncs({
    fetch: passthrough,
    locals: { token },
    parent: () => Promise.resolve({ datePreferences }),
    url: new URL(`https://og.trakt.tv${path}`),
  }, scope);

describe('loadSyncs', () => {
  it("should read the viewer's imports five a page, with the count and the newest date", async () => {
    const data = await load('import');
    expect(data).toMatchObject({
      expired: false,
      count: 7,
      latest: 'Nov 25, 2025 11:16 PM',
      page: { current: 1, total: 2 },
    });
    expect(data.expired || data.rows.map((row) => row.id)).toEqual([51, 50]);
    const url = new URL(seen.at(0)?.url ?? '');
    expect(url.searchParams.toString()).toBe('page=1&limit=5');
    expect(seen.at(0)?.headers.get('authorization')).toBe('Bearer viewer');
  });

  it("should date a later page's notice from the newest sync, not the page's first row", async () => {
    const data = await load('import', '/settings/data?page=2');
    expect(data).toMatchObject({ latest: 'May 28, 2026 10:20 PM', page: { current: 2, total: 2 } });
    expect(seen.map((request) => new URL(request.url).search)).toEqual(
      expect.arrayContaining(['?page=2&limit=5', '?page=1&limit=1']),
    );
  });

  it('should read every sync 30 a page and show Watch Now logos', async () => {
    const data = await load('all', '/settings/syncs');
    expect(new URL(seen.at(0)?.url ?? '').pathname).toBe('/users/syncs');
    expect(new URL(seen.at(0)?.url ?? '').searchParams.get('limit')).toBe('30');
    expect(data.expired || data.rows.at(0)?.service).toEqual({
      kind: 'tile',
      slug: 'plex',
      source: { name: 'Plex', color: '#000', logo: 'https://media.trakt.tv/plex.webp' },
    });
  });

  it('should redirect logged-out viewers with the return path and read nothing', async () => {
    await expect(load('import', '/settings/data?page=2', null)).rejects.toMatchObject({
      status: 302,
      location: '/auth/signin?redirect_to=%2Fsettings%2Fdata%3Fpage%3D2',
    });
    expect(seen).toHaveLength(0);
  });

  it('should render an unauthorized response as expired', async () => {
    server.use(http.get(`${API}/users/syncs/import`, () => new HttpResponse(null, { status: 401 })));
    expect(await load('import')).toEqual({ expired: true });
  });

  it('should reject a failed or malformed response rather than show no imports', async () => {
    server.use(http.get(`${API}/users/syncs/import`, () => new HttpResponse(null, { status: 500 })));
    await expect(load('import')).rejects.toMatchObject({ status: 502 });
    server.use(http.get(`${API}/users/syncs/import`, () => HttpResponse.json([{ id: 'x' }])));
    await expect(load('import')).rejects.toMatchObject({ status: 502 });
  });

  it('should still render when the Watch Now sources fail, naming the services instead', async () => {
    server.use(http.get(`${API}/watchnow/sources/us`, () => new HttpResponse(null, { status: 500 })));
    const data = await load('all', '/settings/syncs');
    expect(data.expired || data.rows.at(0)?.service).toEqual({
      kind: 'tile',
      slug: 'plex',
      source: { name: 'Plex', color: '#000' },
    });
  });
});
