import { isRedirect } from '@sveltejs/kit';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { workerUnauthorized } from '../../../lib/api/workerUnauthorized.ts';
import { load } from './+layout.server.ts';

const API = 'https://apiz.trakt.tv';
const PROFILE = { username: 'justin', private: false, name: 'Justin', ids: { slug: 'justin' } };
const STATS = { network: { followers: 3, following: 4 } };

// Every native route answers a stale token with the worker's plain-text 401, public ones included.
const refusingStale = (answer: () => Response) => ({ request }: { request: Request }) =>
  request.headers.get('authorization') === 'Bearer stale' ? workerUnauthorized() : answer();

const seen: Request[] = [];
const server = setupServer(
  http.get(`${API}/users/:id`, (info) => {
    seen.push(info.request);
    return refusingStale(() => HttpResponse.json(PROFILE))(info);
  }),
  http.get(`${API}/users/:id/stats`, refusingStale(() => HttpResponse.json(STATS))),
  http.get(`${API}/users/:id/watching`, refusingStale(() => new HttpResponse(null, { status: 204 }))),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  seen.length = 0;
});
afterAll(() => server.close());

const layout = (id: string, token: string | null) =>
  load(
    {
      fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
      locals: { token },
      params: { id },
      // A stale token loads no settings, so the root layout has no viewer.
      parent: () => Promise.resolve({ user: null }),
      url: new URL(`https://og.test/users/${id}/watchlist`),
    } as unknown as Parameters<typeof load>[0],
  );

const redirectOf = (promise: Promise<unknown>) =>
  promise.then(() => null, (thrown: unknown) => (isRedirect(thrown) ? thrown.location : thrown));

describe('users/[id] layout', () => {
  describe('for a token that stopped working', () => {
    it("should render another member's profile logged-out", async () => {
      const data = await layout('justin', 'stale');

      expect(data.profile.slug).toBe('justin');
      expect(data.counts).toEqual({ followers: 3, following: 4 });
      expect(data.signedIn).toBe(false);
      expect(seen.map((request) => request.headers.get('authorization'))).toEqual(['Bearer stale', null]);
    });

    it('should send /users/me to sign in', async () => {
      expect(await redirectOf(layout('me', 'stale'))).toBe('/auth/signin?redirect_to=%2Fusers%2Fme%2Fwatchlist');
    });
  });

  it('should read the profile once with a working token', async () => {
    const data = await layout('justin', 'fresh');

    expect(data.profile.slug).toBe('justin');
    expect(seen).toHaveLength(1);
  });
});
