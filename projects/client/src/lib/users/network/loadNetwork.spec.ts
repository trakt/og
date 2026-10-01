import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toProfileUser } from '../toProfileUser.ts';
import { loadNetwork } from './loadNetwork.ts';

const API = 'https://apiz.trakt.tv';
const profile = toProfileUser({ username: 'sean', name: 'Sean', private: false, ids: { slug: 'sean' } });
const user = (slug: string, extra: Record<string, unknown> = {}) => ({
  username: slug,
  private: false,
  deleted: false,
  name: slug.toUpperCase(),
  ids: { slug, trakt: 1 },
  ...extra,
});
const followRow = (slug: string, extra: Record<string, unknown> = {}) => ({
  followed_at: '2026-01-01T00:00:00.000Z',
  user: user(slug, extra),
});
const pendingRow = (slug: string) => ({ id: 1, requested_at: '2026-01-01T00:00:00.000Z', user: user(slug) });

const seen: Request[] = [];
const listHeaders = { 'X-Pagination-Page': '2', 'X-Pagination-Page-Count': '3', 'X-Pagination-Item-Count': '120' };
const server = setupServer(
  http.get(`${API}/users/sean/:type`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json([
      followRow('leela'),
      followRow('fry', { private: true }),
      followRow('gone', { deleted: true }),
    ], {
      headers: listHeaders,
    });
  }),
  http.get(`${API}/users/requests/following`, ({ request }) => {
    seen.push(request);
    return HttpResponse.json(Array.from({ length: 60 }, (_, i) => pendingRow(`user-${i}`)));
  }),
  http.get(`${API}/users/me/following`, () => HttpResponse.json([followRow('leela')])),
  http.get(`${API}/users/me/followers`, () => HttpResponse.json([followRow('fry')])),
  http.get(`${API}/users/blocked`, () => HttpResponse.json([])),
  http.get(`${API}/users/requests`, () => HttpResponse.json([])),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const load = (
  options: { token?: string | null; type?: string; locked?: boolean; self?: boolean; query?: string } = {},
) =>
  loadNetwork({
    fetch,
    parent: () =>
      Promise.resolve({
        profile: { ...profile, isLocked: options.locked ?? false },
        isSelf: options.self ?? false,
        user: options.token ? { slug: options.self ? 'sean' : 'justin' } : null,
      }),
    locals: { token: options.token ?? null },
    params: { id: 'sean', type: options.type },
    url: new URL(`https://og.trakt.tv/users/sean/network${options.query ?? ''}`),
  });

describe('loadNetwork', () => {
  it('should load Following by default, 54 a page, without a token when signed out', async () => {
    const result = await load({ query: '?page=2' });

    const url = new URL(seen.at(0)?.url ?? '');
    expect(url.pathname).toBe('/users/sean/following');
    expect(Object.fromEntries(url.searchParams)).toEqual({ extended: 'full,vip', page: '2', limit: '54' });
    expect(seen.at(0)?.headers.has('authorization')).toBe(false);
    expect(result).toMatchObject({
      type: 'following',
      itemCount: 120,
      page: { type: 'paginated', current: 2, total: 3 },
      relations: null,
    });
  });

  it('should map the users and drop deleted accounts', async () => {
    const { users } = await load({ type: 'followers' });

    expect(new URL(seen.at(0)?.url ?? '').pathname).toBe('/users/sean/followers');
    expect(users.map((user) => [user.slug, user.displayName, user.isPrivate])).toEqual([
      ['leela', 'LEELA', false],
      ['fry', 'FRY', true],
    ]);
  });

  it('should stream the viewer relation with each card when signed in', async () => {
    const result = await load({ token: 'viewer-token' });

    expect(seen.at(0)?.headers.get('authorization')).toBe('Bearer viewer-token');
    expect(await result.relations).toEqual({
      leela: { follow: 'following', followsYou: false, blocked: false, requestId: null },
      fry: { follow: 'none', followsYou: true, blocked: false, requestId: null },
    });
    expect(result.viewerSlug).toBe('justin');
  });

  it('should fall back to the public list on a stale token without refreshing', async () => {
    server.use(http.get(`${API}/users/sean/following`, ({ request }) => {
      seen.push(request);
      return request.headers.has('authorization')
        ? new HttpResponse(null, { status: 401 })
        : HttpResponse.json([followRow('leela')]);
    }));

    const result = await load({ token: 'stale' });

    expect(seen.map((request) => request.headers.get('authorization'))).toEqual(['Bearer stale', null]);
    expect(result.users.map((user) => user.slug)).toEqual(['leela']);
  });

  it('should page your own pending follows, which come back whole', async () => {
    const result = await load({ token: 'viewer-token', self: true, type: 'following_pending', query: '?page=2' });

    expect(new URL(seen.at(0)?.url ?? '').pathname).toBe('/users/requests/following');
    expect(result).toMatchObject({ type: 'following_pending', itemCount: 60, page: { current: 2, total: 2 } });
    expect(result.users.map((user) => user.slug)).toEqual(Array.from({ length: 6 }, (_, i) => `user-${54 + i}`));
  });

  it('should show Following for Following (Pending) on anyone else, like OG', async () => {
    const signedOut = await load({ type: 'following_pending' });
    expect(signedOut.type).toBe('following');

    seen.length = 0;
    const other = await load({ token: 'viewer-token', type: 'following_pending' });
    expect(other.type).toBe('following');
    expect(seen.map((request) => new URL(request.url).pathname)).toContain('/users/sean/following');
  });

  it('should render the private frame without surfacing a network error', async () => {
    server.use(http.get(`${API}/users/sean/following`, () => new HttpResponse(null, { status: 401 })));

    expect(await load({ locked: true })).toMatchObject({ users: [], itemCount: 0, relations: null });
  });

  it('should report unknown lists, missing users, failures and invalid response shapes', async () => {
    await expect(load({ type: 'cohort' })).rejects.toMatchObject({ status: 404 });
    server.use(http.get(`${API}/users/sean/following`, () => new HttpResponse(null, { status: 404 })));
    await expect(load()).rejects.toMatchObject({ status: 404 });
    server.use(http.get(`${API}/users/sean/following`, () => new HttpResponse(null, { status: 503 })));
    await expect(load()).rejects.toMatchObject({ status: 502 });
    server.use(http.get(`${API}/users/sean/following`, () => HttpResponse.json([{ user: { ids: {} } }])));
    await expect(load()).rejects.toMatchObject({ status: 502 });
  });
});
