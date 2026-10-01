import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { rawApiFetch } from '../../api/rawApiFetch.ts';
import { saveListOrder } from './saveListOrder.ts';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const endpoint = 'https://apiz.trakt.tv/users/me/lists/reorder';
const notify = { error: vi.fn() };
const save = () =>
  saveListOrder({
    rank: [3, 1, 2],
    notify,
    request: (path, body) =>
      rawApiFetch({
        fetch,
        token: 'viewer',
        path,
        init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      }),
  });
describe('saveListOrder', () => {
  it('should save the complete numeric order on the viewer endpoint', async () => {
    server.use(http.post(endpoint, async ({ request }) => {
      expect(request.headers.get('authorization')).toBe('Bearer viewer');
      expect(await request.json()).toEqual({ rank: [3, 1, 2] });
      return HttpResponse.json({ updated: 3, skipped_ids: [] }, { headers: { 'X-Runtime': '0.04' } });
    }));
    expect(await save()).toBe(true);
  });
  it('should reject skipped ids, partial writes and invalid success bodies', async () => {
    for (const result of [{ updated: 2, skipped_ids: [3] }, { updated: 2, skipped_ids: [] }, { ok: true }]) {
      server.use(http.post(endpoint, () => HttpResponse.json(result)));
      expect(await save()).toBe(false);
    }
    expect(notify.error).toHaveBeenCalledWith(expect.stringContaining('Doh! We ran into an error.'));
  });
  it('should allow rollback after HTTP and network failures', async () => {
    server.use(http.post(endpoint, () => new HttpResponse(null, { status: 403 })));
    expect(await save()).toBe(false);
    server.use(http.post(endpoint, () => HttpResponse.error()));
    expect(await save()).toBe(false);
  });
});
