import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { browserCommentsClient } from './browserCommentsClient.ts';

vi.mock('../../auth/userManager.ts', () => ({
  userManager: () => ({ getUser: () => Promise.resolve({ access_token: 'fixture-token' }) }),
}));
const base = 'https://apiz.trakt.tv';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('browserCommentsClient', () => {
  it('should omit the viewer token on public reads and retain it for comment writes', async () => {
    const refreshed: boolean[] = [];
    server.use(
      http.get(`${base}/comments/2/reactions/summary`, ({ request }) => {
        expect(request.headers.has('authorization')).toBe(false);
        const fresh = new URL(request.url).searchParams.has('og_reaction');
        refreshed.push(fresh);
        if (fresh) expect(request.cache).toBe('no-store');
        return HttpResponse.json({ reaction_count: 0, user_count: 0, distribution: {} });
      }),
      http.get(`${base}/comments/2/replies`, ({ request }) => {
        expect(request.headers.has('authorization')).toBe(false);
        return HttpResponse.json([]);
      }),
      http.post(`${base}/users/hidden/comments`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer fixture-token');
        expect(await request.json()).toEqual({ users: [{ ids: { slug: 'og_tester' } }] });
        return HttpResponse.json({ added: { users: 1 } }, { status: 201 });
      }),
      http.delete(`${base}/comments/2`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer fixture-token');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const client = browserCommentsClient();
    expect(await client.reactionSummary(2)).toEqual({ reaction_count: 0, user_count: 0, distribution: {} });
    expect(await client.reactionSummary(2, true)).toEqual({ reaction_count: 0, user_count: 0, distribution: {} });
    expect(await client.replies(2)).toEqual([]);
    expect(await client.remove(2)).toEqual({ ok: true, comment: null });
    expect(await client.block('og_tester')).toEqual({ ok: true });
    expect(refreshed).toEqual([false, true]);
  });
});
