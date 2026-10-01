import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { api } from '../api/api.ts';
import { loadViewerRelation } from './loadViewerRelation.ts';

const API = 'https://apiz.trakt.tv';
const row = (slug: string) => ({
  followed_at: '2026-01-01T00:00:00.000Z',
  user: { username: slug, private: false, deleted: false, ids: { slug, trakt: 1 } },
});

const server = setupServer(
  http.get(`${API}/users/me/following`, ({ request }) => {
    expect(new URL(request.url).searchParams.get('limit')).toBe('all');
    return HttpResponse.json([row('sean')]);
  }),
  http.get(`${API}/users/me/followers`, () => HttpResponse.json([row('sean')])),
  http.get(`${API}/users/requests/following`, () => HttpResponse.json([])),
  http.get(
    `${API}/users/requests`,
    () => HttpResponse.json([{ id: 4, requested_at: '2026-01-01T00:00:00.000Z', ...row('sean') }]),
  ),
  http.get(`${API}/users/blocked`, () => new HttpResponse(null, { status: 500 })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('loadViewerRelation', () => {
  it('should compose the relation from the viewer lists, treating a failed list as empty', async () => {
    const relation = await loadViewerRelation({ client: api({ token: 'abc' }), slug: 'sean' });

    expect(relation).toEqual({ follow: 'following', followsYou: true, blocked: false, requestId: 4 });
  });
  it('should ignore malformed proxied lists rather than accepting their advertised contract', async () => {
    server.use(
      http.get(
        `${API}/users/requests`,
        () => HttpResponse.json([{ id: 'not-a-number', user: { ids: { slug: 'sean' } } }]),
      ),
      http.get(`${API}/users/requests/following`, () => HttpResponse.json({ pending: ['sean'] })),
    );
    expect(await loadViewerRelation({ client: api({ token: 'abc' }), slug: 'sean' })).toEqual({
      follow: 'following',
      followsYou: true,
      blocked: false,
      requestId: null,
    });
  });
});
