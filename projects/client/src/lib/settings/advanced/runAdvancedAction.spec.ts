import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { workerUnauthorized } from '../../api/workerUnauthorized.ts';
import { authenticatedFetch } from '../../auth/authenticatedFetch.ts';
import { fakeUser } from '../../auth/fakeUser.ts';
import { fakeUserManager } from '../../auth/fakeUserManager.ts';
import { createRecentSearches } from '../../components/header/createRecentSearches.svelte.ts';
import { runAdvancedAction } from './runAdvancedAction.ts';

const API = 'https://apiz.trakt.tv';
const seen: Array<{ method: string; path: string; body: string; bearer: string | null }> = [];
const record = async (request: Request) => {
  seen.push({
    method: request.method,
    path: new URL(request.url).pathname,
    body: await request.text(),
    bearer: request.headers.get('authorization'),
  });
};
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

// Never capture globalThis.fetch itself: a reference taken before listen() skips MSW.
const passthrough: typeof fetch = (...args) => globalThis.fetch(...args);

function viewer(signinSilent?: () => Promise<ReturnType<typeof fakeUser> | null>) {
  const { manager } = fakeUserManager({ current: fakeUser('viewer-token', 3600), signinSilent });
  return authenticatedFetch({ manager, baseFetch: passthrough });
}

describe('runAdvancedAction', () => {
  it('should reset the profile image to the default fanart as the viewer', async () => {
    server.use(http.put(`${API}/users/set_cover`, async ({ request }) => {
      await record(request);
      return new HttpResponse(null, { status: 204 });
    }));

    expect(await runAdvancedAction({ fetch: viewer(), action: 'reset-cover' })).toBe(true);
    expect(seen).toEqual([{
      method: 'PUT',
      path: '/users/set_cover',
      body: JSON.stringify({ cover_type: 'show', cover_id: 0 }),
      bearer: 'Bearer viewer-token',
    }]);
  });

  it('should clear the search history as the viewer', async () => {
    server.use(http.post(`${API}/search/recent/remove/all`, async ({ request }) => {
      await record(request);
      return new HttpResponse(null, { status: 204 });
    }));

    expect(await runAdvancedAction({ fetch: viewer(), action: 'clear-search' })).toBe(true);
    expect(seen).toMatchObject([{ method: 'POST', path: '/search/recent/remove/all', bearer: 'Bearer viewer-token' }]);
  });

  describe("for the header's recent searches", () => {
    const header = () => {
      const values = new Map([['og-recent-searches:viewer', JSON.stringify([{ query: 'Breaking', type: 'shows' }])]]);
      const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => void values.set(key, value),
      };
      return createRecentSearches({ viewer: 'viewer', storage, notify: () => {}, request: () => Promise.reject() });
    };

    it('should empty the open list once the clear went through', async () => {
      server.use(http.post(`${API}/search/recent/remove/all`, () => new HttpResponse(null, { status: 204 })));
      const recent = header();

      expect(await runAdvancedAction({ fetch: viewer(), action: 'clear-search' })).toBe(true);
      expect(recent.user).toEqual([]);
      recent.dispose();
    });

    it('should leave the list alone when the clear failed', async () => {
      server.use(http.post(`${API}/search/recent/remove/all`, () => new HttpResponse(null, { status: 500 })));
      const recent = header();

      expect(await runAdvancedAction({ fetch: viewer(), action: 'clear-search' })).toBe(false);
      expect(recent.user).toEqual([{ query: 'Breaking', type: 'shows' }]);
      recent.dispose();
    });
  });

  it('should delete the account as the viewer', async () => {
    server.use(http.delete(`${API}/users/settings`, async ({ request }) => {
      await record(request);
      return new HttpResponse(null, { status: 204 });
    }));

    expect(await runAdvancedAction({ fetch: viewer(), action: 'delete-account' })).toBe(true);
    expect(seen).toMatchObject([{ method: 'DELETE', path: '/users/settings', bearer: 'Bearer viewer-token' }]);
  });

  it('should retry once with a renewed token', async () => {
    server.use(http.delete(`${API}/users/settings`, async ({ request }) => {
      await record(request);
      return request.headers.get('authorization') === 'Bearer renewed'
        ? new HttpResponse(null, { status: 204 })
        : workerUnauthorized();
    }));

    const fetch = viewer(() => Promise.resolve(fakeUser('renewed', 3600)));
    expect(await runAdvancedAction({ fetch, action: 'delete-account' })).toBe(true);
    expect(seen.map((call) => call.bearer)).toEqual(['Bearer viewer-token', 'Bearer renewed']);
  });

  it('should report a refused call', async () => {
    server.use(
      http.put(`${API}/users/set_cover`, () => HttpResponse.json({ message: 'nope' }, { status: 400 })),
      http.post(`${API}/search/recent/remove/all`, () => new HttpResponse(null, { status: 500 })),
      http.delete(`${API}/users/settings`, () => workerUnauthorized()),
    );

    expect(await runAdvancedAction({ fetch: viewer(), action: 'reset-cover' })).toBe(false);
    expect(await runAdvancedAction({ fetch: viewer(), action: 'clear-search' })).toBe(false);
    expect(await runAdvancedAction({ fetch: viewer(), action: 'delete-account' })).toBe(false);
  });

  it('should report a network failure', async () => {
    server.use(http.post(`${API}/search/recent/remove/all`, () => HttpResponse.error()));

    expect(await runAdvancedAction({ fetch: viewer(), action: 'clear-search' })).toBe(false);
  });
});
