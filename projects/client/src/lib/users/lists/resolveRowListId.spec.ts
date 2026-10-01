import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { resolveRowListId } from './resolveRowListId.ts';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const row = {
  id: null,
  kind: 'watchlist',
  owner: { slug: 'owner', name: '', href: '', avatar: '', vip: null },
} as const;
describe('resolveRowListId', () => {
  it('should return an existing id without a read', async () => {
    expect(await resolveRowListId({ fetch, row: { ...row, id: 9 } })).toBe(9);
  });
  it.each(['watchlist', 'favorites'] as const)('should read the %s id even when it has no comments', async (kind) => {
    server.use(
      http.get(
        `https://apiz.trakt.tv/users/owner/${kind}/comments/newest`,
        () => HttpResponse.json([], { headers: { 'X-List-ID': '23' } }),
      ),
    );
    expect(await resolveRowListId({ fetch, row: { ...row, kind } })).toBe(23);
  });
  it.each([undefined, '0', 'oops'])('should reject a missing or invalid id %s', async (id) => {
    server.use(
      http.get(
        'https://apiz.trakt.tv/users/owner/watchlist/comments/newest',
        () => HttpResponse.json([], { headers: id ? { 'X-List-ID': id } : {} }),
      ),
    );
    await expect(resolveRowListId({ fetch, row })).rejects.toThrow();
  });
  it('should reject a malformed body', async () => {
    server.use(
      http.get(
        'https://apiz.trakt.tv/users/owner/watchlist/comments/newest',
        () => HttpResponse.json({}, { headers: { 'X-List-ID': '23' } }),
      ),
    );
    await expect(resolveRowListId({ fetch, row })).rejects.toThrow();
  });
});
