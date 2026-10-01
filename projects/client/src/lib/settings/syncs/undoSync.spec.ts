import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { undoSync } from './undoSync.ts';

const API = 'https://apiz.trakt.tv';
const seen: Array<{ method: string; path: string; bearer: string | null }> = [];
const server = setupServer(http.delete(`${API}/users/syncs/:id`, ({ request }) => {
  seen.push({
    method: request.method,
    path: new URL(request.url).pathname,
    bearer: request.headers.get('authorization'),
  });
  return new HttpResponse(null, { status: 204 });
}));
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const passthrough: typeof fetch = (...args) => globalThis.fetch(...args);
const request = (path: string, init: RequestInit) => rawApiFetch({ fetch: passthrough, token: 'viewer', path, init });
const notify = () => ({ success: vi.fn(), error: vi.fn() });

describe('undoSync', () => {
  it("should delete the sync as the viewer and toast OG's success", async () => {
    const toasts = notify();
    expect(await undoSync({ id: 102, request, notify: toasts })).toBe(true);
    expect(seen).toEqual([{ method: 'DELETE', path: '/users/syncs/102', bearer: 'Bearer viewer' }]);
    expect(toasts.success).toHaveBeenCalledWith('Sync undone!');
  });

  it("should toast the API's message, else OG's fallback, when it fails", async () => {
    const toasts = notify();
    server.use(http.delete(`${API}/users/syncs/:id`, () => HttpResponse.json({ message: 'Nope.' }, { status: 422 })));
    expect(await undoSync({ id: 102, request, notify: toasts })).toBe(false);
    expect(toasts.error).toHaveBeenCalledWith('Nope.');
    server.use(http.delete(`${API}/users/syncs/:id`, () => new HttpResponse(null, { status: 404 })));
    await undoSync({ id: 102, request, notify: toasts });
    expect(toasts.error).toHaveBeenLastCalledWith('Doh! We ran into some sort of error.');
    expect(toasts.success).not.toHaveBeenCalled();
  });
});
