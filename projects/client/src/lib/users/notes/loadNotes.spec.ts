import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../toProfileUser.ts';
import { loadNotes } from './loadNotes.ts';

const profile = toProfileUser({ username: 'tester', name: 'Tester', private: false, ids: { slug: 'tester' } });
const datePreferences = { order: 'mdy', hour24: false, timeZone: 'UTC', weekStartDay: 0 } as const;
const seen: Request[] = [];
const rows = [{
  type: 'movie',
  movie: { title: 'Fight Club', ids: { trakt: 1 } },
  attached_to: { type: 'movie' },
  note: { id: 1, notes: 'Hi', privacy: 'public', updated_at: '2026-09-29T12:00:00Z' },
}];
const server = setupServer(
  http.get(/^https:\/\/apiz\.trakt\.tv\/users\/tester\/notes(?:\/[^?]+)?(?:\?.*)?$/, ({ request }) => {
    seen.push(request);
    return HttpResponse.json(rows, {
      headers: { 'X-Pagination-Page': '2', 'X-Pagination-Page-Count': '3', 'X-Pagination-Item-Count': '61' },
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());
const load = (options: { token?: string | null; type?: string; locked?: boolean; query?: string } = {}) =>
  loadNotes({
    fetch,
    parent: () => Promise.resolve({ profile: { ...profile, isLocked: options.locked ?? false }, datePreferences }),
    locals: { token: options.token ?? null },
    params: { id: 'tester', type: options.type },
    url: new URL(`https://og.trakt.tv/users/tester/notes${options.query ?? ''}`),
  });

describe('loadNotes', () => {
  it('should send the viewer token, filter and pagination and map response headers', async () => {
    const result = await load({ token: 'viewer-token', type: 'collection', query: '?page=2&limit=30' });
    expect(seen.at(0)?.headers.get('authorization')).toBe('Bearer viewer-token');
    expect(seen.at(0)?.url).toContain('/notes/collection?extended=full%2Cimages%2Cvip&page=2&limit=30');
    expect(result).toMatchObject({
      type: 'collection',
      itemCount: 61,
      page: { current: 2, total: 3 },
      notes: [{ text: 'Hi' }],
    });
  });

  it('should use the bare endpoint for all types without a logged-out token', async () => {
    await load();
    expect(new URL(seen.at(0)?.url ?? '').pathname).toBe('/users/tester/notes');
    expect(seen.at(0)?.headers.has('authorization')).toBe(false);
  });

  it('should fall back to public notes on a stale token without refreshing', async () => {
    server.use(http.get('https://apiz.trakt.tv/users/tester/notes', ({ request }) => {
      seen.push(request);
      return request.headers.has('authorization') ? new HttpResponse(null, { status: 401 }) : HttpResponse.json([]);
    }));
    expect((await load({ token: 'stale' })).notes).toEqual([]);
    expect(seen.map((request) => request.headers.get('authorization'))).toEqual(['Bearer stale', null]);
  });

  it('should render the private frame without surfacing a notes error', async () => {
    server.use(http.get('https://apiz.trakt.tv/users/tester/notes', () => new HttpResponse(null, { status: 403 })));
    expect((await load({ locked: true })).notes).toEqual([]);
  });

  it('should report missing users, failures and invalid response shapes', async () => {
    server.use(http.get('https://apiz.trakt.tv/users/tester/notes', () => new HttpResponse(null, { status: 404 })));
    await expect(load()).rejects.toMatchObject({ status: 404 });
    server.use(http.get('https://apiz.trakt.tv/users/tester/notes', () => new HttpResponse(null, { status: 503 })));
    await expect(load()).rejects.toMatchObject({ status: 502 });
    server.use(http.get('https://apiz.trakt.tv/users/tester/notes', () => HttpResponse.json([{ id: 1 }])));
    await expect(load()).rejects.toMatchObject({ status: 502 });
  });

  it('should reject unsupported filters before requesting notes', async () => {
    await expect(load({ type: 'lists' })).rejects.toMatchObject({ status: 404 });
    expect(seen).toEqual([]);
  });
});
